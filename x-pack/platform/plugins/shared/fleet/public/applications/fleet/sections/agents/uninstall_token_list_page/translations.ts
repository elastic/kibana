/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const POLICY_ID_TITLE = i18n.translate('xpack.fleet.uninstallTokenList.policyIdTitle', {
  defaultMessage: 'Policy ID',
});

export const POLICY_NAME_TITLE = i18n.translate('xpack.fleet.uninstallTokenList.policyNameTitle', {
  defaultMessage: 'Policy name',
});

export const CREATED_AT_TITLE = i18n.translate('xpack.fleet.uninstallTokenList.createdAtTitle', {
  defaultMessage: 'Created at',
});

export const TOKEN_TITLE = i18n.translate('xpack.fleet.uninstallTokenList.tokenTitle', {
  defaultMessage: 'Token',
});
export const ACTIONS_TITLE = i18n.translate('xpack.fleet.uninstallTokenList.actionsTitle', {
  defaultMessage: 'Actions',
});

export const VIEW_UNINSTALL_COMMAND_LABEL = i18n.translate(
  'xpack.fleet.uninstallTokenList.viewUninstallCommandLabel',
  { defaultMessage: 'View uninstall command' }
);

export const SEARCH_BY_POLICY_ID_OR_NAME_PLACEHOLDER = i18n.translate(
  'xpack.fleet.uninstallTokenList.searchByPolicyIdOrNamePlaceholder',
  { defaultMessage: 'Search by policy ID or policy name' }
);

export const SEARCH_BY_POLICY_ID_OR_NAME_HINT = i18n.translate(
  'xpack.fleet.uninstallTokenList.searchByPolicyIdOrNameHint',
  {
    defaultMessage:
      'If an Agent policy is deleted, its policy name is also deleted. Use the policy ID to search for uninstall tokens related to deleted Agent policies.',
  }
);
