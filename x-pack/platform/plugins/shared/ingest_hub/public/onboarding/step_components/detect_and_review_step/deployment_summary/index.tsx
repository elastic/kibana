/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiAccordion,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { AwsServiceMatrixEntry, DeploymentMethod } from '../../../aws_service_matrix';
import type { ServiceChipState } from '../../../onboarding_flow_context';
import { ServiceTile } from './service_tile';
import { useDeploymentSummary } from './use_deployment_summary';

interface DeploymentSummaryProps {
  selectedServiceIds: string[];
  awsServicesMap: Map<string, AwsServiceMatrixEntry> | undefined;
  serviceNames: Record<string, string>;
  statusByInstanceId: Record<string, ServiceChipState>;
  deploymentMethod: DeploymentMethod;
  receivingCount: number;
  totalCount: number;
}

export function DeploymentSummary({
  selectedServiceIds,
  awsServicesMap,
  serviceNames,
  statusByInstanceId,
  deploymentMethod,
  receivingCount,
  totalCount,
}: DeploymentSummaryProps) {
  const summaryFields = useDeploymentSummary(deploymentMethod);

  const serviceCountText = i18n.translate(
    'xpack.ingestHub.detectAndReviewStep.deploymentSummary.serviceCount',
    {
      defaultMessage: '{count, plural, one {# service} other {# services}}',
      values: { count: totalCount },
    }
  );

  const extraAction = (
    <EuiText size="s" color="subdued">
      {serviceCountText}
    </EuiText>
  );

  const listItems = summaryFields.map((f) => ({
    title: <FormattedMessage id={f.labelId} defaultMessage={f.defaultMessage} />,
    description: f.value as string,
  }));

  return (
    <>
      <EuiTitle size="xs">
        <h3>
          <FormattedMessage
            id="xpack.ingestHub.detectAndReviewStep.deploymentSummary.title"
            defaultMessage="Deployment summary"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        <FormattedMessage
          id="xpack.ingestHub.detectAndReviewStep.deploymentSummary.receivingCount"
          defaultMessage="{receiving} of {total} services receiving data"
          values={{ receiving: receivingCount, total: totalCount }}
        />
      </EuiText>
      <EuiSpacer size="m" />

      {summaryFields.length > 0 && (
        <>
          <EuiDescriptionList type="column" listItems={listItems} />
          <EuiSpacer size="m" />
        </>
      )}

      <EuiAccordion
        id="deployment-summary-services"
        initialIsOpen
        extraAction={extraAction}
        buttonContent={
          <EuiText size="s">
            <strong>
              <FormattedMessage
                id="xpack.ingestHub.detectAndReviewStep.deploymentSummary.servicesAccordionTitle"
                defaultMessage="Services"
              />
            </strong>
          </EuiText>
        }
        data-test-subj="deploymentSummary-accordion"
      >
        <EuiSpacer size="s" />
        <EuiFlexGroup direction="column" gutterSize="s">
          {selectedServiceIds.map((id) => {
            const entry = awsServicesMap?.get(id);
            if (!entry) return null;
            return (
              <EuiFlexItem key={id}>
                <ServiceTile
                  name={serviceNames[id] ?? entry.name}
                  status={statusByInstanceId[id] ?? 'instantiating'}
                  entry={entry}
                  deploymentMethod={deploymentMethod}
                />
              </EuiFlexItem>
            );
          })}
        </EuiFlexGroup>
      </EuiAccordion>
    </>
  );
}
