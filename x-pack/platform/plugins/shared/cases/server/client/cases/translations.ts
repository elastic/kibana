/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ADDED_BY = (user: string) =>
  i18n.translate('xpack.cases.server.addedBy', {
    defaultMessage: 'Added by {user}',
    values: { user },
  });

export const VIEW_IN_KIBANA = i18n.translate('xpack.cases.server.viewCaseInKibana', {
  defaultMessage: 'For more details, view this case in Kibana',
});

export const VIEW_ALERTS_IN_KIBANA = i18n.translate('xpack.cases.server.viewAlertsInKibana', {
  defaultMessage: 'For more details, view the alerts in Kibana',
});

export const CASE_URL = (url: string) =>
  i18n.translate('xpack.cases.server.caseUrl', {
    defaultMessage: 'Case URL: {url}',
    values: { url },
  });

export const ALERTS_URL = (url: string) =>
  i18n.translate('xpack.cases.server.alertsUrl', {
    defaultMessage: 'Alerts URL: {url}',
    values: { url },
  });

export const UNKNOWN = i18n.translate('xpack.cases.server.unknown', {
  defaultMessage: 'Unknown',
});

export const INVALID_CLOSE_REASON = (closeReason: string) =>
  i18n.translate('xpack.cases.server.invalidCloseReason', {
    defaultMessage:
      'Invalid close reason: "{closeReason}". Must be one of the default close reasons or a configured custom close reason.',
    values: { closeReason },
  });

export const ROOM_TITLE = (caseTitle: string) =>
  i18n.translate('xpack.cases.server.room.title', {
    defaultMessage: 'Room: {caseTitle}',
    values: { caseTitle },
  });

export const ROOM_UNKNOWN_AUTHOR = i18n.translate('xpack.cases.server.room.unknownAuthor', {
  defaultMessage: 'a teammate',
});

export const POSTED_FROM_ROOM_BY = (name: string) =>
  i18n.translate('xpack.cases.server.room.postedFromRoomBy', {
    defaultMessage: 'Posted from the room by {name}',
    values: { name },
  });

export const ROOM_OWNER_STAYS_ASSIGNED = (name: string, caseTitle: string) =>
  i18n.translate('xpack.cases.server.room.ownerStaysAssigned', {
    defaultMessage:
      '{name} can\'t be removed from the assignees of "{caseTitle}". {name} opened this case\'s room and owns it, so they stay assigned while the room exists. You can still add or remove anyone else.',
    values: { name, caseTitle },
  });

export const ROOM_OWNER_STAYS_ASSIGNED_UNNAMED = (caseTitle: string) =>
  i18n.translate('xpack.cases.server.room.ownerStaysAssignedUnnamed', {
    defaultMessage:
      'The person who opened the room of "{caseTitle}" can\'t be removed from its assignees. They own the room, so they stay assigned while the room exists. You can still add or remove anyone else.',
    values: { caseTitle },
  });
