/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const EXTERNAL_TICKET = i18n.translate('xpack.cases.investigations.externalTicket.title', {
  defaultMessage: 'External incident',
});

export const LOADING = i18n.translate('xpack.cases.investigations.externalTicket.loading', {
  defaultMessage: 'Loading the external incident',
});

export const LOAD_ERROR = i18n.translate('xpack.cases.investigations.externalTicket.loadError', {
  defaultMessage: 'Could not load the external incident',
});

export const CONNECTOR_LABEL = i18n.translate(
  'xpack.cases.investigations.externalTicket.connectorLabel',
  { defaultMessage: 'Incident management system' }
);

export const CONNECTOR_HELP = i18n.translate(
  'xpack.cases.investigations.externalTicket.connectorHelp',
  {
    defaultMessage:
      'To create and update this investigation in an external system, select a connector.',
  }
);

export const NO_CONNECTORS = i18n.translate(
  'xpack.cases.investigations.externalTicket.noConnectors',
  {
    defaultMessage: 'No connectors that Cases can push to are set up in this space.',
  }
);

export const CONNECTOR_CHANGE_ERROR = i18n.translate(
  'xpack.cases.investigations.externalTicket.connectorChangeError',
  { defaultMessage: 'Could not change the connector' }
);

export const NOT_PUSHED = i18n.translate('xpack.cases.investigations.externalTicket.notPushed', {
  defaultMessage: 'Not pushed yet.',
});

export const PUSH_AS = (connectorName: string) =>
  i18n.translate('xpack.cases.investigations.externalTicket.pushAs', {
    defaultMessage: 'Push as {connectorName} incident',
    values: { connectorName },
  });

export const PUSH_TO = (connectorName: string) =>
  i18n.translate('xpack.cases.investigations.externalTicket.pushTo', {
    defaultMessage: 'Push to {connectorName}',
    values: { connectorName },
  });

export const UPDATE_INCIDENT = (connectorName: string) =>
  i18n.translate('xpack.cases.investigations.externalTicket.updateIncident', {
    defaultMessage: 'Update {connectorName} incident',
    values: { connectorName },
  });

export const UP_TO_DATE = (connectorName: string) =>
  i18n.translate('xpack.cases.investigations.externalTicket.upToDate', {
    defaultMessage: '{connectorName} incident is up to date',
    values: { connectorName },
  });

export const PUSH_SUCCESS = (connectorName: string, externalId: string) =>
  i18n.translate('xpack.cases.investigations.externalTicket.pushSuccess', {
    defaultMessage: 'Pushed to {connectorName} as {externalId}.',
    values: { connectorName, externalId },
  });

export const UPDATE_SUCCESS = (connectorName: string, externalId: string) =>
  i18n.translate('xpack.cases.investigations.externalTicket.updateSuccess', {
    defaultMessage: 'Updated {connectorName} incident {externalId}.',
    values: { connectorName, externalId },
  });

export const PUSH_ERROR = (connectorName: string) =>
  i18n.translate('xpack.cases.investigations.externalTicket.pushError', {
    defaultMessage: 'Could not push to {connectorName}',
    values: { connectorName },
  });

export const INCIDENT_LABEL = i18n.translate('xpack.cases.investigations.externalTicket.incident', {
  defaultMessage: 'Incident',
});

export const OPEN_INCIDENT_ARIA = (externalId: string, connectorName: string) =>
  i18n.translate('xpack.cases.investigations.externalTicket.openIncidentAria', {
    defaultMessage: 'Open incident {externalId} in {connectorName}',
    values: { externalId, connectorName },
  });

export const PUSHED_BY = (by: string) =>
  i18n.translate('xpack.cases.investigations.externalTicket.pushedBy', {
    defaultMessage: 'Pushed by {by}',
    values: { by },
  });

export const AUTO_PUSH = i18n.translate('xpack.cases.investigations.externalTicket.autoPush', {
  defaultMessage: 'Push changes automatically',
});

export const AUTO_PUSH_HELP = i18n.translate(
  'xpack.cases.investigations.externalTicket.autoPushHelp',
  {
    defaultMessage:
      'Title, description, tags, comments and status changes are pushed a few seconds after you make them.',
  }
);

export const AUTO_PUSH_AFTER_FIRST = i18n.translate(
  'xpack.cases.investigations.externalTicket.autoPushAfterFirst',
  { defaultMessage: 'Available after the first push.' }
);

export const AUTO_PUSH_ERROR = i18n.translate(
  'xpack.cases.investigations.externalTicket.autoPushError',
  { defaultMessage: 'Could not change automatic push' }
);

export const SYNC_FROM = (connectorName: string) =>
  i18n.translate('xpack.cases.investigations.externalTicket.syncFrom', {
    defaultMessage: 'Sync from {connectorName}',
    values: { connectorName },
  });

export const SYNC_HELP = i18n.translate('xpack.cases.investigations.externalTicket.syncHelp', {
  defaultMessage:
    'Pulls a changed title, description and status from the incident. Tags and comments only go to it.',
});

export const SYNC_NOTHING_NEW = (connectorName: string) =>
  i18n.translate('xpack.cases.investigations.externalTicket.syncNothingNew', {
    defaultMessage: 'Nothing new in the {connectorName} incident.',
    values: { connectorName },
  });

export const SYNC_SUCCESS = (connectorName: string, changes: string) =>
  i18n.translate('xpack.cases.investigations.externalTicket.syncSuccess', {
    defaultMessage: 'Synced from {connectorName}: {changes}',
    values: { connectorName, changes },
  });

export const SYNC_ERROR = (connectorName: string) =>
  i18n.translate('xpack.cases.investigations.externalTicket.syncError', {
    defaultMessage: 'Could not sync from {connectorName}',
    values: { connectorName },
  });

export const LAST_SYNC = i18n.translate('xpack.cases.investigations.externalTicket.lastSync', {
  defaultMessage: 'Last synced',
});

export const LAST_SYNC_NOTHING = i18n.translate(
  'xpack.cases.investigations.externalTicket.lastSyncNothing',
  { defaultMessage: 'nothing new' }
);

export const READ_ONLY = i18n.translate('xpack.cases.investigations.externalTicket.readOnly', {
  defaultMessage: 'You need Cases update access to change the external incident.',
});

export const TAKE_ACTION_ENTRY = i18n.translate(
  'xpack.cases.investigations.externalTicket.takeActionEntry',
  { defaultMessage: 'External incident…' }
);
