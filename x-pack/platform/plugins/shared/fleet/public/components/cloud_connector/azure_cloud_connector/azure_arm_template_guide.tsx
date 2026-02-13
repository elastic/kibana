/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCodeBlock, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export interface AzureArmTemplateGuideProps {
  elasticStackId?: string;
}

export const AzureArmTemplateGuide: React.FC<AzureArmTemplateGuideProps> = ({ elasticStackId }) => {
  return (
    <div>
      <EuiText size="s" color="subdued">
        <ol>
          <li>
            <FormattedMessage
              id="xpack.fleet.cloudConnector.azure.guide.steps.login"
              defaultMessage="Log in to the Azure console."
            />
          </li>
          <li>
            <FormattedMessage
              id="xpack.fleet.cloudConnector.azure.guide.steps.deploy"
              defaultMessage="Return to Kibana. Click {deployButton}, below."
              values={{
                deployButton: <strong>{'Deploy in Azure'}</strong>,
              }}
            />
          </li>
          <li>
            <FormattedMessage
              id="xpack.fleet.cloudConnector.azure.guide.steps.region"
              defaultMessage="(Optional) Set the {region} where you want to deploy your ARM template."
              values={{
                region: <strong>{'region'}</strong>,
              }}
            />
          </li>
          <li>
            <FormattedMessage
              id="xpack.fleet.cloudConnector.azure.guide.steps.stackId"
              defaultMessage="Copy your {elasticStackId} into the ARM template. Do not change the value of the {issuer} field"
              values={{
                issuer: <strong>{'Elastic Cloud Issuer'}</strong>,
                elasticStackId: <strong>{'Elastic Stack ID'}</strong>,
              }}
            />
            <EuiSpacer size="m" />
            <EuiCodeBlock isCopyable fontSize="l">
              {elasticStackId}
            </EuiCodeBlock>
            <EuiSpacer size="m" />
          </li>
          <li>
            <FormattedMessage
              id="xpack.fleet.cloudConnector.azure.guide.steps.review"
              defaultMessage="Click {reviewButton}."
              values={{
                reviewButton: <strong>{'Review + Create'}</strong>,
              }}
            />
          </li>
          <li>
            <FormattedMessage
              id="xpack.fleet.cloudConnector.azure.guide.steps.outputs"
              defaultMessage="Once the deployment is complete, go to the {outputs} tab and copy the {outputValues} fields and paste them into Kibana, below."
              values={{
                outputs: <strong>{'Outputs'}</strong>,
                outputValues: (
                  <strong>{'ClientID, TenantID, and Elastic Cloud Connector ID'}</strong>
                ),
              }}
            />
          </li>
        </ol>
      </EuiText>
    </div>
  );
};
