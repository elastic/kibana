/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import React from 'react';
import {
  EuiButton,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useAbortController } from '@kbn/react-hooks';
import { lastValueFrom } from 'rxjs';
import { DashboardRenderer } from '@kbn/dashboard-plugin/public';
import { useKibana } from '../../../hooks/use_kibana';
import { AssetImage } from '../../asset_image';
import { useAIFeatures } from '../../../hooks/use_ai_features';

export function StreamDetailDashboardGeneration({
  definition,
}: {
  definition: Streams.all.GetResponse;
}) {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const aiFeatures = useAIFeatures();

  const [suggestedDashboard, setSuggestedDashboard] = React.useState<any | null>(null);
  const [isGenerating, setIsGenerating] = React.useState(false);

  const c = useAbortController();

  async function onGenerateDashboardClick() {
    setIsGenerating(true);
    try {
      const observable = streamsRepositoryClient.stream(
        'POST /internal/streams/{name}/_suggest_dashboard',
        {
          params: {
            path: {
              name: definition.stream.name,
            },
            body: {
              connector_id: aiFeatures?.genAiConnectors?.selectedConnector || '',
            },
          },
          signal: c.signal,
        }
      );

      const dashboard = await lastValueFrom(observable);
      setSuggestedDashboard(dashboard);
      setIsGenerating(false);
    } catch (error) {
      setIsGenerating(false);
    }
  }

  if (isGenerating) {
    return (
      <EuiFlexGroup direction="column" alignItems="center" justifyContent="center">
        <EuiSpacer size="m" />
        <EuiLoadingSpinner size="m" />
        <EuiTitle size="s">
          <h2>
            {i18n.translate('xpack.streams.streamDetailDashboardGeneration.generatingTitle', {
              defaultMessage: 'Generating dashboard',
            })}
          </h2>
        </EuiTitle>
        <EuiText size="s" textAlign="center" css={{ maxWidth: 480 }}>
          {i18n.translate('xpack.streams.streamDetailDashboardGeneration.generatingDescription', {
            defaultMessage:
              'This may take a few moments depending on the size of your data. Please wait...',
          })}
        </EuiText>
      </EuiFlexGroup>
    );
  }
  if (!suggestedDashboard) {
    return (
      <EuiFlexGroup direction="column" alignItems="center" justifyContent="center">
        <EuiSpacer size="m" />
        <AssetImage type="barChart" size="m" />
        <EuiTitle size="s">
          <h2>
            {i18n.translate(
              'xpack.streams.streamDetailDashboardGeneration.h2.generateDashboardLabel',
              { defaultMessage: 'Generate dashboard' }
            )}
          </h2>
        </EuiTitle>
        <EuiText size="s" textAlign="center" css={{ maxWidth: 480 }}>
          {i18n.translate(
            'xpack.streams.streamDetailDashboardGeneration.generateADashboardBasedTextLabel',
            { defaultMessage: "Generate a dashboard based on the stream's data." }
          )}
        </EuiText>
        <EuiFlexGroup direction="row" gutterSize="s">
          <EuiButton iconType="sparkles" fill onClick={onGenerateDashboardClick}>
            {i18n.translate(
              'xpack.streams.streamDetailDashboardGeneration.generateDashboardButtonLabel',
              { defaultMessage: 'Generate dashboard' }
            )}
          </EuiButton>
        </EuiFlexGroup>
      </EuiFlexGroup>
    );
  }

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexGroup direction="row" gutterSize="s">
        <EuiButton
          iconType="refresh"
          onClick={() => {
            onGenerateDashboardClick();
          }}
        >
          {i18n.translate(
            'xpack.streams.streamDetailDashboardGeneration.generateAnotherButtonLabel',
            { defaultMessage: 'Generate another' }
          )}
        </EuiButton>
      </EuiFlexGroup>
      <EuiCodeBlock language="json" isCopyable overflowHeight={600}>
        {JSON.stringify(suggestedDashboard, null, 2)}
      </EuiCodeBlock>
      <EuiSpacer size="m" />
      <DashboardRenderer
        getCreationOptions={async () =>
          Promise.resolve({
            getInitialInput: () => ({
              viewMode: 'view',
              panels: suggestedDashboard.kibanaDashboard?.data?.panels || {},
              timeRange: { from: 'now-24h', to: 'now' },
            }),
          })
        }
      />
    </EuiFlexGroup>
  );
}
