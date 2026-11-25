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
  integrationName: string;
  policyNames: string[];
  packUrl?: string;
}

const SharedIntegrationWarningToastContent = ({
  integrationName,
  policyNames,
  packUrl,
}: SharedIntegrationWarningToastContentProps) => {
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
    <>
      <p>
        {i18n.translate('xpack.osquery.pack.sharedIntegrationWarningToast.text', {
          defaultMessage:
            'The integration "{integrationName}" is shared, so this pack also runs on: {agentPolicies}.',
          values: { integrationName, agentPolicies },
        })}
      </p>
      {packUrl && (
        <EuiLink data-test-subj="sharedIntegrationWarningToastPackLink" href={packUrl}>
          {i18n.translate('xpack.osquery.pack.sharedIntegrationWarningToast.viewPackLink', {
            defaultMessage: 'View pack',
          })}
        </EuiLink>
      )}
    </>
  );
};

/**
 * Surfaces the additive `warnings` returned by pack create/update: a pack
 * written into a shared Osquery Manager integration also runs on every agent
 * policy that shares it. Agent policy names come from the cached
 * `['agentPolicies']` query when available, otherwise the ids are shown. At
 * most three names are listed, followed by "and N more", with a link to the
 * pack when its id is known.
 */
export const addSharedIntegrationWarningToasts = ({
  warnings,
  packId,
  toasts,
  queryClient,
  getUrlForApp,
  startServices,
}: {
  warnings: SharedIntegrationWarning[] | undefined;
  packId: string | undefined;
  toasts: Pick<IToasts, 'addWarning'>;
  queryClient: QueryClient;
  getUrlForApp: ApplicationStart['getUrlForApp'];
  startServices: Parameters<typeof toMountPoint>[1];
}) => {
  if (!warnings?.length) return;

  const cachedPolicies = queryClient.getQueryData<OsqueryAgentPolicy[]>(['agentPolicies']);
  const nameById = new Map((cachedPolicies ?? []).map(({ id, name }) => [id, name]));
  const packUrl = packId
    ? getUrlForApp(PLUGIN_ID, { path: pagePathGetters.pack_edit({ packId }) })
    : undefined;

  for (const warning of warnings) {
    if (!warning.additional_policy_ids?.length) continue;

    const policyNames = resolveNames(warning.additional_policy_ids, nameById);

    toasts.addWarning({
      title: i18n.translate('xpack.osquery.pack.sharedIntegrationWarningToast.title', {
        defaultMessage: 'Pack also runs on other agent policies',
      }),
      text: toMountPoint(
        <SharedIntegrationWarningToastContent
          integrationName={warning.package_policy_name || warning.package_policy_id}
          policyNames={policyNames}
          packUrl={packUrl}
        />,
        startServices
      ),
    });
  }
};
