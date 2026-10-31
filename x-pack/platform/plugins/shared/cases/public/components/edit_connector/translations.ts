/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export * from '../../common/translations';
export {
  UPDATE_INCIDENT,
  PUSH_INCIDENT,
  PUSH_LOCKED_TITLE,
  PUSH_LOCKED_DESC,
} from '../use_push_to_service/translations';

export const EDIT_CONNECTOR_ARIA = i18n.translate(
  'xpack.cases.editConnector.editConnectorLinkAria',
  {
    defaultMessage: 'click to edit connector',
  }
);

export const SYNC_TITLE = i18n.translate('xpack.cases.editConnector.syncTitle', {
  defaultMessage: 'Sync',
});

export const AUTO_PUSH_LABEL = i18n.translate('xpack.cases.editConnector.autoPushLabel', {
  defaultMessage: 'Push changes automatically',
});

export const AUTO_PUSH_ON = i18n.translate('xpack.cases.editConnector.autoPushOn', {
  defaultMessage: 'On',
});

export const AUTO_PUSH_OFF = i18n.translate('xpack.cases.editConnector.autoPushOff', {
  defaultMessage: 'Off',
});

export const CONFLICT_STRATEGY_LABEL = i18n.translate(
  'xpack.cases.editConnector.conflictStrategyLabel',
  {
    defaultMessage: 'If a field changed in both places',
  }
);

export const CONFLICT_KEEP_EXTERNAL = i18n.translate(
  'xpack.cases.editConnector.conflictKeepExternal',
  {
    defaultMessage: 'Keep the external value',
  }
);

export const CONFLICT_KEEP_KIBANA = i18n.translate('xpack.cases.editConnector.conflictKeepKibana', {
  defaultMessage: 'Keep the Kibana value',
});

export const SYNC_FROM = (connectorName: string) =>
  i18n.translate('xpack.cases.editConnector.syncFrom', {
    values: { connectorName },
    defaultMessage: 'Sync from {connectorName}',
  });

export const SYNC_REQUIRES_PUSH = (connectorName: string) =>
  i18n.translate('xpack.cases.editConnector.syncRequiresPush', {
    values: { connectorName },
    defaultMessage: 'Push the case to {connectorName} before syncing from it',
  });
