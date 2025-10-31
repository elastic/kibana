/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { Streams, Feature } from '@kbn/streams-schema';
import { EuiPanel, EuiText, EuiFlexGroup, EuiFlexItem, EuiButton, EuiSpacer } from '@elastic/eui';
import { useStreamFeatures } from './stream_features/hooks/use_stream_features';
import { useAIFeatures } from '../stream_detail_significant_events_view/add_significant_event_flyout/generated_flow_form/use_ai_features';
import { useStreamFeaturesApi } from '../../hooks/use_stream_features_api';
import { StreamFeaturesFlyout } from './stream_features/stream_features_flyout';
import { StreamFeaturesAccordion } from './stream_features/stream_features_accordion';

interface StreamConfigurationProps {
  definition: Streams.all.Definition;
}

export function StreamFeatureConfiguration({ definition }: StreamConfigurationProps) {
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);
  const { identifyFeatures, abort } = useStreamFeaturesApi(definition);
  const aiFeatures = useAIFeatures();
  const [features, setFeatures] = useState<Feature[]>([]);
  const {
    features: existingFeatures,
    refreshFeatures,
    featuresLoading,
  } = useStreamFeatures(definition);

  const [isLoading, setIsLoading] = useState(false);

  return (
    <EuiPanel hasBorder={true} hasShadow={false} paddingSize="none" grow={false}>
      <EuiPanel hasShadow={false} color="subdued">
        <EuiText size="s">
          <h3>
            {i18n.translate('xpack.streams.streamDetailView.configurationTitle', {
              defaultMessage: 'Feature identification',
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
                  'Use AI to generate logical subsets of the data in this stream. You will find useful insights like programming language, operating system, cloud provider etc. This is useful for generating better significant events.',
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
                identifyFeatures(aiFeatures?.genAiConnectors.selectedConnector!, 'now', 'now-24h')
                  .then((data) => {
                    setFeatures(data.features);
                  })
                  .finally(() => {
                    setIsLoading(false);
                  });
              }}
            >
              {i18n.translate('xpack.streams.streamDetailView.featureIdentificationButtonLabel', {
                defaultMessage: 'Identify features',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
        {existingFeatures.length > 0 && (
          <>
            <EuiSpacer size="m" />
            <StreamFeaturesAccordion
              definition={definition}
              features={existingFeatures}
              loading={featuresLoading}
              refresh={refreshFeatures}
            />
          </>
        )}
        {isFlyoutVisible && (
          <StreamFeaturesFlyout
            definition={definition}
            features={features}
            isLoading={isLoading}
            closeFlyout={() => {
              abort();
              refreshFeatures();
              setIsFlyoutVisible(false);
            }}
            setFeatures={setFeatures}
          />
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
}
