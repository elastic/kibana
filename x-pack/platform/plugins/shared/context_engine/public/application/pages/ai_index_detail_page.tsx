/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiPanel,
  EuiSkeletonRectangle,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import React from 'react';

const Panel = ({ title, description }: { title: string; description: string }) => (
  <EuiPanel hasBorder paddingSize="l">
    <EuiTitle size="s">
      <h2>{title}</h2>
    </EuiTitle>
    <EuiSpacer size="s" />
    <EuiText size="s" color="subdued">
      <p>{description}</p>
    </EuiText>
    <EuiSpacer size="m" />
    <EuiSkeletonText lines={2} />
  </EuiPanel>
);

export const AiIndexDetailPage = () => {
  return (
    <KibanaPageTemplate data-test-subj="contextAiIndexDetailPage">
      <KibanaPageTemplate.Header
        pageTitle={
          <>
            {i18n.translate('xpack.contextEngine.aiIndexDetail.title', {
              defaultMessage: 'My AI index',
            })}{' '}
            <EuiBadge color="success">
              {i18n.translate('xpack.contextEngine.aiIndexDetail.statusBadge', {
                defaultMessage: 'Active',
              })}
            </EuiBadge>
          </>
        }
      />
      <KibanaPageTemplate.Section>
        <Panel
          title={i18n.translate('xpack.contextEngine.aiIndexDetail.description.title', {
            defaultMessage: 'Description',
          })}
          description={i18n.translate('xpack.contextEngine.aiIndexDetail.description.description', {
            defaultMessage:
              'No sources yet — add a source and a summary will be generated automatically.',
          })}
        />
        <EuiSpacer size="l" />
        <Panel
          title={i18n.translate('xpack.contextEngine.aiIndexDetail.sources.title', {
            defaultMessage: 'Sources',
          })}
          description={i18n.translate('xpack.contextEngine.aiIndexDetail.sources.description', {
            defaultMessage:
              'ES|QL views, indices, Connectors and stream signals feeding this AI index.',
          })}
        />
        <EuiSpacer size="l" />
        <EuiPanel hasBorder paddingSize="l">
          <EuiTitle size="s">
            <h2>
              {i18n.translate('xpack.contextEngine.aiIndexDetail.automations.title', {
                defaultMessage: 'Automations',
              })}
            </h2>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate('xpack.contextEngine.aiIndexDetail.automations.description', {
                defaultMessage:
                  "Automations extract and refresh this AI index's Knowledge Indicators from its sources.",
              })}
            </p>
          </EuiText>
          <EuiSpacer size="m" />
          <EuiSkeletonRectangle width="100%" height={88} borderRadius="m" />
        </EuiPanel>
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
