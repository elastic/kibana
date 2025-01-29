/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import type { TransformCapabilities } from '../types/capabilities';

// create the text for button's tooltips if the user
// doesn't have the permission to press that button
export function createCapabilityFailureMessage(
  capability: keyof TransformCapabilities | 'noTransformNodes'
) {
  let message = '';

  switch (capability) {
    case 'canCreateTransform':
      message = i18n.translate('xpack.transform.capability.noPermission.createTransformTooltip', {
        defaultMessage: 'You do not have permission to create transforms.',
      });
      break;
    case 'canCreateTransformAlerts':
      message = i18n.translate(
        'xpack.transform.capability.noPermission.canCreateTransformAlertsTooltip',
        {
          defaultMessage: 'You do not have permission to create transform alert rules.',
        }
      );
      break;
    case 'canScheduleNowTransform':
      message = i18n.translate(
        'xpack.transform.capability.noPermission.scheduleNowTransformTooltip',
        {
          defaultMessage:
            'You do not have permission to schedule transforms to process data instantly.',
        }
      );
      break;
    case 'canStartStopTransform':
      message = i18n.translate(
        'xpack.transform.capability.noPermission.startOrStopTransformTooltip',
        {
          defaultMessage: 'You do not have permission to start or stop transforms.',
        }
      );
      break;

    case 'canReauthorizeTransform':
      message = i18n.translate(
        'xpack.transform.capability.noPermission.reauthorizeTransformTooltip',
        {
          defaultMessage: 'You do not have permission to reauthorize transforms.',
        }
      );
      break;

    case 'canDeleteTransform':
      message = i18n.translate('xpack.transform.capability.noPermission.deleteTransformTooltip', {
        defaultMessage: 'You do not have permission to delete transforms.',
      });
      break;

    case 'canResetTransform':
      message = i18n.translate('xpack.transform.capability.noPermission.resetTransformTooltip', {
        defaultMessage: 'You do not have permission to reset transforms.',
      });
      break;

    case 'noTransformNodes':
      message = i18n.translate('xpack.transform.capability.noPermission.noTransformNodesTooltip', {
        defaultMessage: 'There are no transform nodes available.',
      });
      break;
  }

  return i18n.translate('xpack.transform.capability.pleaseContactAdministratorTooltip', {
    defaultMessage: '{message} Please contact your administrator.',
    values: {
      message,
    },
  });
}
