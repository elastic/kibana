/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryClient } from '@kbn/react-query';
import type { IToasts } from '@kbn/core-notifications-browser';
import { i18n } from '@kbn/i18n';

import type { SharedIntegrationWarning } from '../../common/api/packs/shared_integration_warning';
import type { OsqueryAgentPolicy } from '../agent_policies/types';

/**
 * Surfaces the additive `warnings` returned by pack create/update: a pack
 * written into a shared Osquery Manager integration also runs on every agent
 * policy that shares it. Agent policy names come from the cached
 * `['agentPolicies']` query when available, otherwise the ids are shown.
 */
export const addSharedIntegrationWarningToasts = (
  warnings: SharedIntegrationWarning[] | undefined,
  toasts: Pick<IToasts, 'addWarning'>,
  queryClient: QueryClient
) => {
  if (!warnings?.length) return;

  const cachedPolicies = queryClient.getQueryData<OsqueryAgentPolicy[]>(['agentPolicies']);
  const nameById = new Map((cachedPolicies ?? []).map(({ id, name }) => [id, name]));

  for (const warning of warnings) {
    if (!warning.additional_policy_ids?.length) continue;

    toasts.addWarning({
      title: i18n.translate('xpack.osquery.pack.sharedIntegrationWarningToast.title', {
        defaultMessage: 'Pack also runs on other agent policies',
      }),
      text: i18n.translate('xpack.osquery.pack.sharedIntegrationWarningToast.text', {
        defaultMessage:
          'The integration "{integrationName}" is shared, so this pack also runs on: {agentPolicies}.',
        values: {
          integrationName: warning.package_policy_name || warning.package_policy_id,
          agentPolicies: warning.additional_policy_ids
            .map((id) => nameById.get(id) ?? id)
            .join(', '),
        },
      }),
    });
  }
};
