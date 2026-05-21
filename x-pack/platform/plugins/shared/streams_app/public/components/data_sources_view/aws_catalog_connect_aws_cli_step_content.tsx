/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiButton, EuiCodeBlock, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../hooks/use_kibana';

/** Prototype template URL for the CloudFormation stack file used with the AWS CLI. */
export const AWS_ELASTIC_STACK_TEMPLATE_URL =
  'https://elastic-cloudformation.s3.amazonaws.com/elastic-stack.yml';

export type AwsCatalogConnectAwsCliContentMode = 'full' | 'download' | 'cli';

export interface AwsCatalogConnectAwsCliStepContentProps {
  readonly externalId?: string;
  readonly elasticEndpoint?: string;
  readonly elasticApiKey?: string;
  readonly awsRegion?: string;
  readonly mode?: AwsCatalogConnectAwsCliContentMode;
}

function resolveElasticEndpoint(basePath: { get: () => string }, override?: string): string {
  if (override?.trim()) {
    return override.trim();
  }
  if (typeof window === 'undefined') {
    return 'https://my-deployment.kb.io';
  }
  const path = basePath.get();
  const normalizedPath = path.endsWith('/') ? path.slice(0, -1) : path;
  return `${window.location.origin}${normalizedPath}`;
}

export function buildAwsCatalogCliDeployCommand(params: {
  readonly externalId: string;
  readonly elasticEndpoint: string;
  readonly elasticApiKey?: string;
  readonly awsRegion?: string;
}): string {
  const { externalId, elasticEndpoint, elasticApiKey, awsRegion } = params;
  const resolvedApiKey = elasticApiKey?.trim() || '<api-token>';
  const resolvedRegion = awsRegion?.trim() || '<AWS Region>';

  return [
    'aws cloudformation deploy \\',
    '  --stack-name elastic-aws-stack \\',
    '  --template-file elastic-stack.yml \\',
    '  --parameter-overrides \\',
    `    ExternalId="${externalId}" \\`,
    `    ElasticEndpoint="${elasticEndpoint}" \\`,
    `    ElasticApiKey="${resolvedApiKey}" \\`,
    '    CloudtrailBucket="<S3 Bucket Name>" \\',
    '    GuarddutyDetectorId="<Detector ID>" \\',
    `    GuarddutyRegion="${resolvedRegion}" \\`,
    `    InspectorRegion="${resolvedRegion}" \\`,
    `    SecurityhubRegion="${resolvedRegion}" \\`,
    `    SecurityhubInsRegion="${resolvedRegion}" \\`,
    `    SecurityhubIpRegion="${resolvedRegion}" \\`,
    '    VpcflowBucket="<S3 Bucket Name>" \\',
    '  --capabilities CAPABILITY_NAMED_IAM',
  ].join('\n');
}

export const AwsCatalogConnectAwsCliStepContent: React.FC<AwsCatalogConnectAwsCliStepContentProps> = ({
  externalId = '',
  elasticEndpoint: elasticEndpointProp,
  elasticApiKey,
  awsRegion,
  mode = 'full',
}) => {
  const {
    core: {
      http: { basePath },
    },
  } = useKibana();

  const resolvedExternalId = externalId.trim() || 'ela-keilp2wubu';

  const resolvedElasticEndpoint = useMemo(
    () => resolveElasticEndpoint(basePath, elasticEndpointProp),
    [basePath, elasticEndpointProp]
  );

  const cliCommand = useMemo(
    () =>
      buildAwsCatalogCliDeployCommand({
        externalId: resolvedExternalId,
        elasticEndpoint: resolvedElasticEndpoint,
        elasticApiKey,
        awsRegion,
      }),
    [awsRegion, elasticApiKey, resolvedElasticEndpoint, resolvedExternalId]
  );

  const downloadSection = (
    <>
      <EuiText size="s" color="subdued">
        <p style={{ margin: 0 }}>
          {i18n.translate('xpack.streams.dataSources.awsDelivery.downloadIntro', {
            defaultMessage:
              'Download the CloudFormation template before running the AWS CLI command.',
          })}
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiButton
        iconType="download"
        iconSide="left"
        href={AWS_ELASTIC_STACK_TEMPLATE_URL}
        target="_blank"
        data-test-subj="streamsAwsCatalogConnectAwsCliDownloadTemplate"
      >
        {i18n.translate('xpack.streams.dataSources.awsConnect.cli.downloadTemplate', {
          defaultMessage: 'Download elastic-stack.yml',
        })}
      </EuiButton>
    </>
  );

  const cliSection = (
    <>
      <EuiText size="s" color="subdued">
        <p style={{ margin: 0 }}>
          {i18n.translate('xpack.streams.dataSources.awsDelivery.cliIntro', {
            defaultMessage:
              'Run from your terminal in the AWS account and Region where you deploy the stack.',
          })}
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiCodeBlock
        language="shell"
        fontSize="m"
        paddingSize="m"
        isCopyable
        data-test-subj="streamsAwsCatalogConnectAwsCliCommand"
      >
        {cliCommand}
      </EuiCodeBlock>
    </>
  );

  if (mode === 'download') {
    return (
      <div data-test-subj="streamsAwsCatalogConnectAwsCliDownload">{downloadSection}</div>
    );
  }

  if (mode === 'cli') {
    return <div data-test-subj="streamsAwsCatalogConnectAwsCliCommandSection">{cliSection}</div>;
  }

  return (
    <div data-test-subj="streamsAwsCatalogConnectAwsCliStepContent">
      <EuiTitle size="xs">
        <h4>
          {i18n.translate('xpack.streams.dataSources.awsConnect.cli.sectionTitle', {
            defaultMessage: 'AWS CLI',
          })}
        </h4>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        <p style={{ margin: 0 }}>
          {i18n.translate('xpack.streams.dataSources.awsConnect.cli.intro', {
            defaultMessage: 'Run from your terminal. Download the template first.',
          })}
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      {downloadSection}
      <EuiSpacer size="m" />
      {cliSection}
    </div>
  );
};
