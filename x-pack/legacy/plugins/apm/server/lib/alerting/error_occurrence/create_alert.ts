/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { ERROR_OCCURRENCE_ALERT_TYPE_ID } from '../../../../common/alerting/constants';
import { ActionsClient } from '../../../../../actions';
import { AlertsClient } from '../../../../../alerting';

interface Properties {
  serviceName: string;
  threshold: number;
  interval: string;
  actions: {
    email: string;
    slack: string;
  };
}

interface Clients {
  alertsClient: AlertsClient;
  actionsClient: ActionsClient;
}

interface Action {
  actionTypeId: string;
  description: string;
  config: Record<string, any>;
  secrets: Record<string, any>;
}
const createAlert = async (
  { alertsClient, actionsClient }: Clients,
  { actions: { slack, email }, serviceName, threshold, interval }: Properties
) => {
  const actions: Array<{ params: Record<string, any>; action: Action }> = [];

  const values = {
    errorLogMessage: '{{{context.errorLogMessage}}}',
    errorCulprit: '{{{context.errorCulprit}}}',
    docCount: '{{context.docCount}}',
    serviceName,
    threshold,
    interval
  };

  if (email) {
    actions.push({
      action: {
        actionTypeId: '.email',
        description: 'Email notifications for error occurrences',
        config: {
          from: ''
        },
        secrets: {
          user: '',
          password: ''
        }
      },
      params: {
        to: email,
        subject: i18n.translate(
          'xpack.apm.serviceDetails.enableErrorReportsPanel.emailSubjectText',
          {
            defaultMessage:
              '{serviceName} has error groups which exceeds the threshold',
            values: { serviceName }
          }
        ),
        body: i18n.translate(
          'xpack.apm.serviceDetails.enableErrorReportsPanel.emailTemplateText',
          {
            defaultMessage:
              `Your service {serviceName} has error groups which exceeds {threshold} occurrences within {interval}<br/>` +
              '<br/>' +
              '{errorLogMessage}<br/>' +
              '{errorCulprit}<br/>' +
              '{docCount} occurrences<br/>',
            values
          }
        )
      }
    });
  }

  if (slack) {
    actions.push({
      action: {
        actionTypeId: '.slack',
        description: 'Slack notifications for error occurrences',
        config: {},
        secrets: {
          webhookUrl: slack
        }
      },
      params: {
        message: i18n.translate(
          'xpack.apm.serviceDetails.enableErrorReportsPanel.slackTemplateText',
          {
            defaultMessage: `Your service *{serviceName}* has error groups which exceeds {threshold} occurrences within {interval}
>*{errorLogMessage}*
>\`{errorCulprit}\`
>{docCount} occurrences`,
            values
          }
        )
      }
    });
  }

  if (!actions.length) {
    throw new Error(
      'No actions were defined. Need at least one of email, slack'
    );
  }

  const actionResults = await Promise.all(
    actions.map(({ action, params }) => {
      return actionsClient
        .create({
          action: {
            actionTypeId: action.actionTypeId,
            description: action.description,
            config: action.config,
            secrets: action.secrets
          }
        })
        .then(result => ({
          result,
          params
        }));
    })
  );

  return alertsClient.create({
    data: {
      name: `Error threshold for ${serviceName} exceeded`,
      alertTypeId: ERROR_OCCURRENCE_ALERT_TYPE_ID,
      alertTypeParams: {
        serviceName,
        threshold,
        interval
      },
      interval,
      enabled: true,
      actions: actionResults.map(({ result, params }) => {
        return {
          group: 'default',
          id: result.id,
          params
        };
      }),
      throttle: null
    }
  });
};

export { createAlert };
