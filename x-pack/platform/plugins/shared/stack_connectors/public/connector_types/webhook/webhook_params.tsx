/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public';
import { JsonEditorWithMessageVariables } from '@kbn/triggers-actions-ui-plugin/public';
import { EuiCallOut } from '@elastic/eui';
import { WebhookMethods } from '../../../common/auth/constants';
import type { WebhookActionParams } from '../types';

const WebhookParamsFields: React.FunctionComponent<ActionParamsProps<WebhookActionParams>> = ({
  actionParams,
  actionConnector,
  editAction,
  index,
  messageVariables,
  errors,
}) => {
  const { body } = actionParams;
  const webhookMethod: WebhookMethods | undefined =
    actionConnector && 'config' in actionConnector
      ? (actionConnector?.config.method as unknown as WebhookMethods)
      : undefined;

  return webhookMethod && [WebhookMethods.GET, WebhookMethods.DELETE].includes(webhookMethod) ? (
    <EuiCallOut
      announceOnMount
      iconType="info"
      title={i18n.translate(
        'xpack.stackConnectors.components.webhook.noSetupRequiredCalloutTitle',
        {
          values: { method: webhookMethod.toUpperCase() },
          defaultMessage: 'This connector is configured to use the {method} method.',
        }
      )}
      data-test-subj="placeholderCallout"
    >
      <p>
        {i18n.translate('xpack.stackConnectors.components.webhook.noSetupRequiredCallout', {
          defaultMessage:
            'No additional setup is required - a request will automatically be sent to the configured url.',
        })}
      </p>
    </EuiCallOut>
  ) : (
    <JsonEditorWithMessageVariables
      messageVariables={messageVariables}
      paramsProperty={'body'}
      inputTargetValue={body}
      label={i18n.translate('xpack.stackConnectors.components.webhook.bodyFieldLabel', {
        defaultMessage: 'Body',
      })}
      ariaLabel={i18n.translate(
        'xpack.stackConnectors.components.webhook.bodyCodeEditorAriaLabel',
        {
          defaultMessage: 'Code editor',
        }
      )}
      errors={errors.body as string[]}
      onDocumentsChange={(json: string) => {
        editAction('body', json, index);
      }}
      onBlur={() => {
        if (!body) {
          editAction('body', '', index);
        }
      }}
      dataTestSubj="actionJsonEditor"
    />
  );
};

// eslint-disable-next-line import/no-default-export
export { WebhookParamsFields as default };
