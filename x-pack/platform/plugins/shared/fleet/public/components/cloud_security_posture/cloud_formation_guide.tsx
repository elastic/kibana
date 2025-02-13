/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import type { CloudSecurityIntegrationAwsAccountType } from '../agent_enrollment_flyout/types';

const CLOUD_FORMATION_EXTERNAL_DOC_URL =
  'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cfn-whatis-howdoesitwork.html';

const Link = ({ children, url }: { children: React.ReactNode; url: string }) => (
  <EuiLink
    href={url}
    target="_blank"
    rel="noopener nofollow noreferrer"
    data-test-subj="externalLink"
  >
    {children}
  </EuiLink>
);

export const CloudFormationGuide = ({
  awsAccountType,
}: {
  awsAccountType?: CloudSecurityIntegrationAwsAccountType;
}) => {
  return (
    <EuiText>
      <p>
        <FormattedMessage
          id="xpack.fleet.cloudFormation.guide.description"
          defaultMessage="CloudFormation will create all the necessary resources to evaluate the security posture of your AWS environment. {learnMore}."
          values={{
            learnMore: (
              <Link url={CLOUD_FORMATION_EXTERNAL_DOC_URL}>
                <FormattedMessage
                  id="xpack.fleet.cloudFormation.guide.learnMoreLinkText"
                  defaultMessage="Learn more about CloudFormation"
                />
              </Link>
            ),
          }}
        />
      </p>
      <EuiText size="s" color="subdued">
        <ol>
          {awsAccountType === 'organization-account' ? (
            <li>
              <FormattedMessage
                id="xpack.fleet.cloudFormation.guide.steps.organizationLogin"
                defaultMessage="Log in as an admin in the management account of the AWS Organization you want to onboard"
              />
            </li>
          ) : (
            <li>
              <FormattedMessage
                id="xpack.fleet.cloudFormation.guide.steps.login"
                defaultMessage="Log in as an admin in the AWS account you want to onboard"
              />
            </li>
          )}
          <li>
            <FormattedMessage
              id="xpack.fleet.cloudFormation.guide.steps.launch"
              defaultMessage="Click the Launch CloudFormation button below."
            />
          </li>
          <li>
            <FormattedMessage
              id="xpack.fleet.cloudFormation.guide.steps.region"
              defaultMessage="(Optional) Change the Amazon region in the upper right corner to the region you want to deploy your stack to"
            />
          </li>
          <li>
            <FormattedMessage
              id="xpack.fleet.cloudFormation.guide.steps.accept"
              defaultMessage="Tick the checkbox under capabilities in the opened CloudFormation stack review form: {acknowledge}"
              values={{
                acknowledge: (
                  <strong>
                    <FormattedMessage
                      id="xpack.fleet.cloudFormation.guide.steps.accept.acknowledge"
                      defaultMessage="I acknowledge that AWS CloudFormation might create IAM resources."
                    />
                  </strong>
                ),
              }}
            />
          </li>
          <li>
            <FormattedMessage
              id="xpack.fleet.cloudFormation.guide.steps.create"
              defaultMessage="Click Create stack."
            />
          </li>
        </ol>
      </EuiText>
    </EuiText>
  );
};
