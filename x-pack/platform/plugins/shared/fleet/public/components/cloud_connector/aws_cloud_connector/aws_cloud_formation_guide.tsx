/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import type { AccountType } from '../../../types';
import { ORGANIZATION_ACCOUNT } from '../constants';

const CLOUD_FORMATION_EXTERNAL_DOC_URL =
  'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cfn-whatis-howdoesitwork.html';

export type CloudFormationCredentialType = 'identity_federation' | 'direct_access_keys';

export interface CloudFormationCloudCredentialsGuideProps {
  accountType?: AccountType;
  credentialType?: CloudFormationCredentialType;
}

export const CloudFormationCloudCredentialsGuide: React.FC<
  CloudFormationCloudCredentialsGuideProps
> = ({ accountType = ORGANIZATION_ACCOUNT, credentialType = 'identity_federation' }) => {
  const isOrganization = accountType === ORGANIZATION_ACCOUNT;

  const lastStep =
    credentialType === 'direct_access_keys' ? (
      <FormattedMessage
        id="xpack.fleet.cloudConnector.aws.guide.steps.accessKeyCredentials"
        defaultMessage="Copy {accessKeyId} and {secretAccessKey} then paste the credentials below"
        values={{
          accessKeyId: <strong>{'Access Key ID'}</strong>,
          secretAccessKey: <strong>{'Secret Access Key'}</strong>,
        }}
      />
    ) : (
      <FormattedMessage
        id="xpack.fleet.cloudConnector.aws.guide.steps.credentials"
        defaultMessage="Copy {role} and {external_id} then paste the role credentials below"
        values={{
          role: <strong>{'Role ARN'}</strong>,
          external_id: <strong>{'External ID'}</strong>,
        }}
      />
    );

  return (
    <div>
      {credentialType === 'direct_access_keys' && (
        <EuiText size="s" color="subdued">
          <p>
            <FormattedMessage
              id="xpack.fleet.cloudConnector.aws.guide.directAccessKeys.intro"
              defaultMessage="Access keys are long-term credentials for an IAM user. Use AWS CloudFormation to automatically create an IAM user with the required read permissions and generate access keys. {learnMore}."
              values={{
                learnMore: (
                  <EuiLink
                    href={CLOUD_FORMATION_EXTERNAL_DOC_URL}
                    target="_blank"
                    rel="noopener nofollow noreferrer"
                  >
                    <FormattedMessage
                      id="xpack.fleet.cloudConnector.aws.guide.directAccessKeys.learnMore"
                      defaultMessage="Learn more about CloudFormation"
                    />
                  </EuiLink>
                ),
              }}
            />
          </p>
        </EuiText>
      )}
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
          <li>{lastStep}</li>
        </ol>
      </EuiText>
    </div>
  );
};
