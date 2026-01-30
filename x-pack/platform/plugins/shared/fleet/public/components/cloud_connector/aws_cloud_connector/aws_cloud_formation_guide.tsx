/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export interface CloudFormationCloudCredentialsGuideProps {
  isOrganization?: boolean;
}

export const CloudFormationCloudCredentialsGuide: React.FC<
  CloudFormationCloudCredentialsGuideProps
> = ({ isOrganization = false }) => {
  return (
    <div>
      <EuiText size="s" color="subdued">
        <ol>
          {isOrganization ? (
            <li>
              <FormattedMessage
                id="xpack.fleet.cloudConnector.aws.guide.steps.organizationLogin"
                defaultMessage="Log in as an {admin} in the management account of the AWS Organization you want to onboard"
                values={{
                  admin: <strong>{'admin'}</strong>,
                }}
              />
            </li>
          ) : (
            <li>
              <FormattedMessage
                id="xpack.fleet.cloudConnector.aws.guide.steps.singleLogin"
                defaultMessage="Log in as an {admin} in the AWS account you want to onboard"
                values={{
                  admin: <strong>{'admin'}</strong>,
                }}
              />
            </li>
          )}
          <li>
            <FormattedMessage
              id="xpack.fleet.cloudConnector.aws.guide.steps.launch"
              defaultMessage="Click the {launchCloudFormation} button below."
              values={{
                launchCloudFormation: <strong>{'Launch CloudFormation'}</strong>,
              }}
            />
          </li>
          <li>
            <FormattedMessage
              id="xpack.fleet.cloudConnector.aws.guide.steps.region"
              defaultMessage="(Optional) Change the {amazonRegion} in the upper right corner to the region you want to deploy your stack to"
              values={{
                amazonRegion: <strong>{'AWS region'}</strong>,
              }}
            />
          </li>
          <li>
            <FormattedMessage
              id="xpack.fleet.cloudConnector.aws.guide.steps.accept"
              defaultMessage="Tick the checkbox under {capabilities} in the opened CloudFormation stack review form: {acknowledge}"
              values={{
                acknowledge: (
                  <strong>
                    <FormattedMessage
                      id="xpack.fleet.cloudConnector.aws.guide.steps.accept.acknowledge"
                      defaultMessage="I acknowledge that AWS CloudFormation might create IAM resources."
                    />
                  </strong>
                ),
                capabilities: (
                  <strong>
                    <FormattedMessage
                      id="xpack.fleet.cloudConnector.aws.guide.steps.accept.capabilities"
                      defaultMessage="capabilities"
                    />
                  </strong>
                ),
              }}
            />
          </li>
          <li>
            <FormattedMessage
              id="xpack.fleet.cloudConnector.aws.guide.steps.create"
              defaultMessage="Click {createStack}."
              values={{
                createStack: <strong>{'Create stack'}</strong>,
              }}
            />
          </li>
          <li>
            <FormattedMessage
              id="xpack.fleet.cloudConnector.aws.guide.steps.stackStatus"
              defaultMessage="Once stack status is {createComplete} then click the Outputs tab"
              values={{
                createComplete: <strong>{'CREATE_COMPLETE'}</strong>,
              }}
            />
          </li>
          <li>
            <FormattedMessage
              id="xpack.fleet.cloudConnector.aws.guide.steps.credentials"
              defaultMessage="Copy {role} and {external_id} then paste the role credentials below"
              values={{
                role: <strong>{'Role ARN'}</strong>,
                external_id: <strong>{'External ID'}</strong>,
              }}
            />
          </li>
        </ol>
      </EuiText>
    </div>
  );
};
