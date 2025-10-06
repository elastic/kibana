/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { Streams, System } from '@kbn/streams-schema';
import { EuiPanel, EuiText, EuiFlexGroup, EuiFlexItem, EuiButton, EuiSpacer } from '@elastic/eui';
import { useStreamSystems } from './stream_systems/hooks/use_stream_systems';
import { useAIFeatures } from '../../stream_detail_significant_events_view/add_significant_event_flyout/generated_flow_form/use_ai_features';
import { useStreamSystemsApi } from '../../../hooks/use_stream_systems_api';
import { StreamSystemsFlyout } from './stream_systems/stream_systems_flyout';
import { StreamSystemsAccordion } from './stream_systems/stream_systems_accordion';

interface StreamConfigurationProps {
  definition: Streams.all.Definition;
}

export function StreamSystemConfiguration({ definition }: StreamConfigurationProps) {
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);
  const { identifySystems } = useStreamSystemsApi(definition);
  const aiFeatures = useAIFeatures();
  const [systems, setSystems] = useState<System[]>([]);
  const { systems: existingSystems, refresh, loading } = useStreamSystems(definition);

  const [isLoading, setIsLoading] = useState(false);

  return (
    <EuiPanel hasBorder={true} hasShadow={false} paddingSize="none" grow={false}>
      <EuiPanel hasShadow={false} color="subdued">
        <EuiText size="s">
          <h3>
            {i18n.translate('xpack.streams.streamDetailView.configurationTitle', {
              defaultMessage: 'Stream system configuration',
            })}
          </h3>
        </EuiText>
      </EuiPanel>
      <EuiFlexGroup direction="column" gutterSize="s" css={{ padding: '24px' }}>
        <EuiFlexGroup direction="row" gutterSize="s">
          <EuiFlexItem grow={false} css={{ maxWidth: '40%' }}>
            <EuiText size="s" color="subdued">
              {i18n.translate('xpack.streams.streamDetailView.configurationDescription', {
                defaultMessage:
                  'We will analyse your stream and provide proposals for the detection of different systems that might be part of your stream. This feature enables a better experience for significant events.',
              })}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              disabled={!aiFeatures?.genAiConnectors.selectedConnector}
              iconType="sparkles"
              onClick={() => {
                setIsLoading(true);
                setIsFlyoutVisible(!isFlyoutVisible);
                identifySystems(aiFeatures?.genAiConnectors.selectedConnector!, 'now', 'now-24h')
                  .then((data) => {
                    setSystems(data.systems);
                  })
                  .finally(() => {
                    setIsLoading(false);
                  });
              }}
            >
              {i18n.translate('xpack.streams.streamDetailView.systemDetectionButtonLabel', {
                defaultMessage: 'Detect systems',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        <StreamSystemsAccordion
          definition={definition}
          systems={existingSystems}
          loading={loading}
          refresh={refresh}
        />
        {isFlyoutVisible && (
          <StreamSystemsFlyout
            definition={definition}
            systems={systems}
            isLoading={isLoading}
            closeFlyout={() => {
              refresh();
              setIsFlyoutVisible(false);
            }}
          />
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
}
