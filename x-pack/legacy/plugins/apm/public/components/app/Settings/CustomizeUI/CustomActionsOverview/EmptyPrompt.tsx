/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export const EmptyPrompt = ({
  onCreateCustomActionClick
}: {
  onCreateCustomActionClick: () => void;
}) => {
  return (
    <EuiEmptyPrompt
      iconType="boxesHorizontal"
      iconColor=""
      title={
        <h2>
          {i18n.translate(
            'xpack.apm.settings.customizeUI.customActions.emptyPromptTitle',
            {
              defaultMessage: 'No actions found.'
            }
          )}
        </h2>
      }
      body={
        <>
          <p>
            {i18n.translate(
              'xpack.apm.settings.customizeUI.customActions.emptyPromptText',
              {
                defaultMessage:
                  "Let's change that! You can add custom actions to the Actions context menu by the trace and error details for each service. This could be linking to a Kibana dashboard or going to your organization's support portal"
              }
            )}
          </p>
        </>
      }
      actions={
        <EuiButton color="primary" fill onClick={onCreateCustomActionClick}>
          {i18n.translate(
            'xpack.apm.settings.customizeUI.customActions.createCustomAction',
            { defaultMessage: 'Create custom action' }
          )}
        </EuiButton>
      }
    />
  );
};
