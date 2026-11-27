/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import type { QueryClient } from '@kbn/react-query';
import type { IToasts } from '@kbn/core-notifications-browser';
import type { ApplicationStart } from '@kbn/core-application-browser';
import { i18n } from '@kbn/i18n';
import { toMountPoint } from '@kbn/react-kibana-mount';

import type { SharedIntegrationWarning } from '../../common/api/packs/shared_integration_warning';
import { PLUGIN_ID } from '../../common';
import { pagePathGetters } from '../common/page_paths';
import type { OsqueryAgentPolicy } from '../agent_policies/types';

const MAX_POLICY_NAMES = 3;

const resolveNames = (ids: string[], nameById: Map<string, string>) =>
  ids.map((id) => nameById.get(id) ?? id);

interface SharedIntegrationWarningToastContentProps {
  entries: Array<{ integrationName: string; policyNames: string[] }>;
  packUrl?: string;
  onViewPack?: (event: React.MouseEvent) => void;
}

const SharedIntegrationWarningToastContent = ({
  entries,
  packUrl,
  onViewPack,
}: SharedIntegrationWarningToastContentProps) => (
  <>
    {entries.map(({ integrationName, policyNames }) => {
      const shown = policyNames.slice(0, MAX_POLICY_NAMES);
      const remaining = policyNames.length - MAX_POLICY_NAMES;

      const agentPolicies =
        remaining > 0
          ? i18n.translate('xpack.osquery.pack.sharedIntegrationWarningToast.truncatedPolicies', {
              defaultMessage: '{agentPolicies} and {remaining} more',
              values: { agentPolicies: shown.join(', '), remaining },
            })
          : i18n.formatList('conjunction', shown);

      return (
        <p key={integrationName}>
          {i18n.translate('xpack.osquery.pack.sharedIntegrationWarningToast.text', {
            defaultMessage:
              'The integration "{integrationName}" is shared, so this pack also runs on: {agentPolicies}.',
            values: { integrationName, agentPolicies },
          })}
        </p>
      );
    })}
    {packUrl && (
      <EuiLink
        data-test-subj="sharedIntegrationWarningToastPackLink"
        href={packUrl}
        onClick={onViewPack}
      >
        {i18n.translate('xpack.osquery.pack.sharedIntegrationWarningToast.viewPackLink', {
          defaultMessage: 'View pack',
        })}
      </EuiLink>
    )}
  </>
);

/**
 * Surfaces the additive `warnings` returned by pack create/update: a pack
 * written into a shared Osquery Manager integration also runs on every agent
 * policy that shares it. Agent policy names come from the cached
 * `['agentPolicies']` query when available, otherwise the ids are shown. At
 * most three names are listed, followed by "and N more", with a link to the
 * pack when its id is known.
 */
// This builds a one-off toast body, not a component that re-renders under a parent, so
// fresh array and function props cost nothing here.
/* eslint-disable react-perf/jsx-no-new-array-as-prop, react-perf/jsx-no-new-function-as-prop, @kbn/compat/react-jsx-no-bind */
export const addSharedIntegrationWarningToasts = ({
  warnings,
  packId,
  toasts,
  queryClient,
  getUrlForApp,
  navigateToApp,
  startServices,
}: {
  warnings: SharedIntegrationWarning[] | undefined;
  packId: string | undefined;
  toasts: Pick<IToasts, 'addWarning'>;
  queryClient: QueryClient;
  getUrlForApp: ApplicationStart['getUrlForApp'];
  navigateToApp: ApplicationStart['navigateToApp'];
  startServices: Parameters<typeof toMountPoint>[1];
}) => {
  const withExtraPolicies = (warnings ?? []).filter(
    ({ additional_policy_ids: ids }) => ids?.length
  );
  if (!withExtraPolicies.length) return;

  const cachedPolicies = queryClient.getQueryData<OsqueryAgentPolicy[]>(['agentPolicies']);
  const nameById = new Map((cachedPolicies ?? []).map(({ id, name }) => [id, name]));
  const packPath = packId ? pagePathGetters.pack_edit({ packId }) : undefined;
  const packUrl = packPath ? getUrlForApp(PLUGIN_ID, { path: packPath }) : undefined;
  const entries = withExtraPolicies.map((warning) => ({
    integrationName: warning.package_policy_name || warning.package_policy_id,
    policyNames: resolveNames(warning.additional_policy_ids ?? [], nameById),
  }));
  const onViewPack = packPath
    ? (event: React.MouseEvent) => {
        // Keep modified clicks (new tab) on the plain href; navigate in-app otherwise.
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
        event.preventDefault();
        navigateToApp(PLUGIN_ID, { path: packPath });
      }
    : undefined;

  // One toast for every warning: Kibana merges toasts that share a title and a mount
  // function's source, so separate toasts per integration would show only the first.
  toasts.addWarning({
    title: i18n.translate('xpack.osquery.pack.sharedIntegrationWarningToast.title', {
      defaultMessage: 'Pack also runs on other agent policies',
    }),
    text: toMountPoint(
      <SharedIntegrationWarningToastContent
        entries={entries}
        packUrl={packUrl}
        onViewPack={onViewPack}
      />,
      startServices
    ),
  });
};
/* eslint-enable react-perf/jsx-no-new-array-as-prop, react-perf/jsx-no-new-function-as-prop, @kbn/compat/react-jsx-no-bind */
