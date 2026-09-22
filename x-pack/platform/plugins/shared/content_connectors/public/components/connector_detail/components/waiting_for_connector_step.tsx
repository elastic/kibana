/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnWarningCallout } from '@kbn/ui-callout';

export interface WaitingForConnectorStepProps {
  isLoading: boolean;
  isRecheckDisabled: boolean;
  recheck: () => void;
  showFinishLaterButton?: boolean;
}
export const WaitingForConnectorStep: React.FC<WaitingForConnectorStepProps> = ({
  recheck,
  isLoading,
  isRecheckDisabled,
  showFinishLaterButton = false,
}) => {
  return (
    <>
      <EuiSpacer />
      <KbnWarningCallout
        title={i18n.translate(
          'xpack.contentConnectors.content.connector_detail.configurationConnector.steps.waitingForConnector.callout.title',
          {
            defaultMessage: 'Waiting for your connector',
          }
        )}
        text={i18n.translate(
          'xpack.contentConnectors.content.connector_detail.configurationConnector.steps.waitingForConnector.callout.description',
          {
            defaultMessage:
              'Your connector has not connected to Search. Troubleshoot your configuration and refresh the page.',
          }
        )}
        actionProps={{
          primary: {
            disabled: isRecheckDisabled,
            'data-test-subj': 'entSearchContent-connector-waitingForConnector-callout-recheckNow',
            'data-telemetry-id':
              'entSearchContent-connector-waitingForConnector-callout-recheckNow',
            iconType: 'refresh',
            onClick: recheck,
            isLoading,
            children: i18n.translate(
              'xpack.contentConnectors.content.connector_detail.configurationConnector.steps.waitingForConnector.callout.button.label',
              {
                defaultMessage: 'Recheck now',
              }
            ),
          },
          secondary: showFinishLaterButton
            ? {
                'data-test-subj':
                  'entSearchContent-connector-waitingForConnector-callout-finishLaterButton',
                'data-telemetry-id':
                  'entSearchContent-connector-waitingForConnector-callout-finishLaterButton',
                iconType: 'save',
                onClick: () => {},
                children: i18n.translate(
                  'xpack.contentConnectors.content.connector_detail.configurationConnector.steps.waitingForConnector.callout.finishLaterButton.label',
                  {
                    defaultMessage: 'Finish deployment later',
                  }
                ),
              }
            : undefined,
        }}
      />
    </>
  );
};
