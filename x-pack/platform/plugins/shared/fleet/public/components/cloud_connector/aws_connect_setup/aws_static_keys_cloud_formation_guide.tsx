/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiButton, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

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
