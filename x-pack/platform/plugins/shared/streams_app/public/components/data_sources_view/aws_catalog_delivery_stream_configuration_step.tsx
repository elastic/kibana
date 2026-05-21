/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import { EuiSteps, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { AwsCatalogConnectAwsCliStepContent } from './aws_catalog_connect_aws_cli_step_content';

export interface AwsCatalogDeliveryStreamConfigurationStepProps {
  /** External ID from Configuration — used in the deploy CLI command only. */
  readonly deployExternalId: string;
  readonly elasticEndpoint: string;
  readonly elasticApiKey?: string;
  readonly awsRegion?: string;
  readonly onCanContinueChange: (canContinue: boolean) => void;
}

export const AwsCatalogDeliveryStreamConfigurationStep: React.FC<
  AwsCatalogDeliveryStreamConfigurationStepProps
> = ({
  deployExternalId,
  elasticEndpoint,
  elasticApiKey,
  awsRegion,
  onCanContinueChange,
}) => {
  const { euiTheme } = useEuiTheme();

  useEffect(() => {
    onCanContinueChange(true);
  }, [onCanContinueChange]);

  useEffect(() => {
    return () => {
      onCanContinueChange(false);
    };
  }, [onCanContinueChange]);

  const deliverySubStepsCss = useMemo(
    () => css`
      overflow: visible;
      padding-inline-start: ${euiTheme.size.xs};
      padding-block-start: ${euiTheme.size.xs};

      .euiStep__content {
        margin-block-start: 0 !important;
        padding-block-start: ${euiTheme.size.s} !important;
        margin-inline-start: 0 !important;
        padding-inline-start: calc(${euiTheme.size.base} + ${euiTheme.size.m}) !important;
      }

      .euiStep:not(:last-of-type) {
        padding-block-end: ${euiTheme.size.l};
      }

      .euiStep__titleWrapper {
        gap: ${euiTheme.size.m} !important;
        align-items: center;
      }
    `,
    [euiTheme.size.base, euiTheme.size.l, euiTheme.size.m, euiTheme.size.s, euiTheme.size.xs]
  );

  const downloadYamlTitle = i18n.translate(
    'xpack.streams.dataSources.awsDelivery.downloadYamlStep',
    {
      defaultMessage: 'Download the yaml file',
    }
  );

  const awsCliTitle = i18n.translate('xpack.streams.dataSources.awsDelivery.awsCliStep', {
    defaultMessage: 'Copy and paste the script on the AWS CLI',
  });

  const deliverySubSteps = useMemo(
    () => [
      {
        title: downloadYamlTitle,
        'data-test-subj': 'streamsAwsCatalogDeliverySubStep-downloadYaml',
        children: (
          <AwsCatalogConnectAwsCliStepContent
            mode="download"
            externalId={deployExternalId}
            elasticEndpoint={elasticEndpoint}
            elasticApiKey={elasticApiKey}
            awsRegion={awsRegion}
          />
        ),
      },
      {
        title: awsCliTitle,
        'data-test-subj': 'streamsAwsCatalogDeliverySubStep-awsCli',
        children: (
          <AwsCatalogConnectAwsCliStepContent
            mode="cli"
            externalId={deployExternalId}
            elasticEndpoint={elasticEndpoint}
            elasticApiKey={elasticApiKey}
            awsRegion={awsRegion}
          />
        ),
      },
    ],
    [awsCliTitle, awsRegion, deployExternalId, downloadYamlTitle, elasticApiKey, elasticEndpoint]
  );

  return (
    <div data-test-subj="streamsAwsCatalogDeliveryStreamConfigurationStep">
      <EuiSteps
        titleSize="xs"
        headingElement="h4"
        data-test-subj="streamsAwsCatalogDeliverySubSteps"
        css={deliverySubStepsCss}
        steps={deliverySubSteps}
      />
    </div>
  );
};
