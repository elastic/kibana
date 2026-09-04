/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiStat,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
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
  const { euiTheme } = useEuiTheme();
  const [isOpen, setIsOpen] = useState(true);
  const panelCss = css`
    border: 1px solid ${euiTheme.colors.borderBaseSubdued};
  `;
  const contentId = useGeneratedHtmlId({ prefix: 'managedIntegrationsContent' });

  const headerButtonCss = css`
    display: block;
    width: 100%;
    text-align: left;
    background-color: ${euiTheme.colors.backgroundBaseSubdued};
    border: none;
    padding: ${euiTheme.size.l} ${euiTheme.size.m};
    cursor: pointer;
    border-bottom: ${isOpen ? `1px solid ${euiTheme.colors.borderBaseSubdued}` : 'none'};
  `;

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
    title: (
      <EuiText color="subdued" size="s">
        <FormattedMessage id={f.labelId} defaultMessage={f.defaultMessage} />
      </EuiText>
    ),
    description: f.value as string,
  }));

  return (
    <EuiPanel
      paddingSize="none"
      css={panelCss}
      data-test-subj="deploymentSummary-panel"
      hasShadow={false}
    >
      <button
        type="button"
        css={headerButtonCss}
        aria-expanded={isOpen}
        aria-controls={contentId}
        onClick={() => setIsOpen((v) => !v)}
        data-test-subj="managedIntegrationsSection-headerButton"
      >
        <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type="checkCircle" size="m" color="subdued" aria-hidden />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s">
              <strong>
                <FormattedMessage
                  id="xpack.ingestHub.detectAndReviewStep.deploymentSummary.title"
                  defaultMessage="Deployment summary"
                />
              </strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{extraAction}</EuiFlexItem>
        </EuiFlexGroup>
      </button>
      {isOpen && (
        <div id={contentId} role="region">
          <EuiPanel paddingSize="m" hasBorder={false} hasShadow={false}>
            {listItems.length > 0 && (
              <>
                <EuiFlexGroup direction="row" gutterSize="xl" responsive={false}>
                  {listItems.map((item) => (
                    <EuiFlexItem grow={false} key={item.description}>
                      <EuiStat title={item.description} description={item.title} titleSize="xs" />
                    </EuiFlexItem>
                  ))}
                </EuiFlexGroup>
                <EuiSpacer size="l" />
                <EuiHorizontalRule margin="none" />
                <EuiSpacer size="l" />
              </>
            )}

            <EuiText size="s" color="subdued">
              <FormattedMessage
                id="xpack.ingestHub.detectAndReviewStep.deploymentSummary.receivingCount"
                defaultMessage="{receiving} of {total} services receiving data"
                values={{ receiving: receivingCount, total: totalCount }}
              />
            </EuiText>
            <EuiSpacer size="m" />

            <EuiFlexGroup wrap gutterSize="s">
              {selectedServiceIds.map((id) => {
                const entry = awsServicesMap?.get(id);
                if (!entry) return null;
                return (
                  <EuiFlexItem
                    key={id}
                    grow={false}
                    style={{ flexBasis: 'calc(25% - 6px)', minWidth: 180 }}
                  >
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
          </EuiPanel>
        </div>
      )}
    </EuiPanel>
  );
}
