/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiButton, EuiCodeBlock, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

const CLOUD_FORMATION_EXTERNAL_DOC_URL =
  'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cfn-whatis-howdoesitwork.html';

export const AWS_STATIC_KEYS_CLOUD_FORMATION_GUIDE_TEST_SUBJ = 'awsStaticKeysCloudFormationGuide';

export interface AwsStaticKeysCloudFormationGuideProps {
  cloudFormationTemplate: string;
  cloudFormationTemplateFileName?: string;
}

export const AwsStaticKeysCloudFormationGuide: React.FC<AwsStaticKeysCloudFormationGuideProps> = ({
  cloudFormationTemplate,
  cloudFormationTemplateFileName = 'elastic-agentless-aws.cloudformation.yml',
}) => {
  const handleDownload = useCallback(() => {
    const link = document.createElement('a');
    link.href = `data:text/x-yaml;charset=utf-8,${encodeURIComponent(cloudFormationTemplate)}`;
    link.download = cloudFormationTemplateFileName;
    link.click();
  }, [cloudFormationTemplate, cloudFormationTemplateFileName]);

  const cliCommand = i18n.translate('xpack.fleet.awsStaticKeysCloudFormationGuide.cliCommand', {
    defaultMessage:
      'aws cloudformation create-stack --stack-name elastic-aws-stack --template-body file://{fileName} --capabilities CAPABILITY_NAMED_IAM',
    values: { fileName: cloudFormationTemplateFileName },
  });

  return (
    <div data-test-subj={AWS_STATIC_KEYS_CLOUD_FORMATION_GUIDE_TEST_SUBJ}>
      <EuiText size="s" color="subdued">
        <p>
          <FormattedMessage
            id="xpack.fleet.awsStaticKeysCloudFormationGuide.intro"
            defaultMessage="Use AWS CloudFormation to create an IAM user with the read permissions required for your selected services, then paste the generated access keys below. {learnMore}."
            values={{
              learnMore: (
                <EuiLink
                  href={CLOUD_FORMATION_EXTERNAL_DOC_URL}
                  target="_blank"
                  rel="noopener nofollow noreferrer"
                >
                  <FormattedMessage
                    id="xpack.fleet.awsStaticKeysCloudFormationGuide.learnMore"
                    defaultMessage="Learn more about CloudFormation"
                  />
                </EuiLink>
              ),
            }}
          />
        </p>
        <ol>
          <li>
            <FormattedMessage
              id="xpack.fleet.awsStaticKeysCloudFormationGuide.stepDownload"
              defaultMessage="Download the CloudFormation template for your selected services."
            />
          </li>
          <li>
            <FormattedMessage
              id="xpack.fleet.awsStaticKeysCloudFormationGuide.stepLogin"
              defaultMessage="Log in as an {admin} in the AWS account you want to onboard."
              values={{ admin: <strong>{'admin'}</strong> }}
            />
          </li>
          <li>
            <FormattedMessage
              id="xpack.fleet.awsStaticKeysCloudFormationGuide.stepDeployCli"
              defaultMessage="Deploy the stack with the AWS CLI from the directory containing the downloaded template:"
            />
          </li>
        </ol>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiCodeBlock language="shell" isCopyable>
        {cliCommand}
      </EuiCodeBlock>
      <EuiSpacer size="m" />
      <EuiText size="s" color="subdued">
        <ol start={4}>
          <li>
            <FormattedMessage
              id="xpack.fleet.awsStaticKeysCloudFormationGuide.stepConsoleAlternative"
              defaultMessage="Alternatively, upload the template in the AWS CloudFormation console and create the stack with {capability} enabled."
              values={{
                capability: (
                  <strong>
                    <FormattedMessage
                      id="xpack.fleet.awsStaticKeysCloudFormationGuide.capability"
                      defaultMessage="CAPABILITY_NAMED_IAM"
                    />
                  </strong>
                ),
              }}
            />
          </li>
          <li>
            <FormattedMessage
              id="xpack.fleet.awsStaticKeysCloudFormationGuide.stepStackStatus"
              defaultMessage="Once the stack status is {createComplete}, open the Outputs tab."
              values={{ createComplete: <strong>{'CREATE_COMPLETE'}</strong> }}
            />
          </li>
          <li>
            <FormattedMessage
              id="xpack.fleet.awsStaticKeysCloudFormationGuide.stepCopyKeys"
              defaultMessage="Copy {accessKeyId} and {secretAccessKey}, then paste them into the fields below."
              values={{
                accessKeyId: <strong>{'Access Key ID'}</strong>,
                secretAccessKey: <strong>{'Secret Access Key'}</strong>,
              }}
            />
          </li>
        </ol>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiButton
        iconType="download"
        onClick={handleDownload}
        data-test-subj={`${AWS_STATIC_KEYS_CLOUD_FORMATION_GUIDE_TEST_SUBJ}-downloadButton`}
      >
        <FormattedMessage
          id="xpack.fleet.awsStaticKeysCloudFormationGuide.downloadButton"
          defaultMessage="Download CloudFormation template"
        />
      </EuiButton>
      <EuiSpacer size="l" />
    </div>
  );
};
