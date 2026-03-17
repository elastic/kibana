/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import type { Feature, Streams } from '@kbn/streams-schema';
import { EuiPanel, EuiText, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { useStreamFeatures } from '../../hooks/use_stream_features';
import { StreamFeaturesAccordion } from './stream_features/stream_features_accordion';
import { Row } from '../data_management/stream_detail_management/advanced_view/row';
import { FeatureIdentificationControl } from '../stream_detail_significant_events_view/feature_identification_control';
import type { AIFeatures } from '../../hooks/use_ai_features';

interface StreamDiscoveryConfigurationProps {
  definition: Streams.all.Definition;
  aiFeatures: AIFeatures | null;
}

export function StreamDiscoveryConfiguration({
  definition,
  aiFeatures,
}: StreamDiscoveryConfigurationProps) {
  const {
    features: existingFeatures,
    refreshFeatures,
    featuresLoading,
  } = useStreamFeatures(definition);

  const [isIdentifyingFeatures, setIsIdentifyingFeatures] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);

  const onSelectFeature = useCallback((feature: Feature | null) => {
    setSelectedFeature(feature);
  }, []);

  const handleFeatureTaskStart = useCallback(() => {
    setIsIdentifyingFeatures(true);
    setSelectedFeature(null);
  }, []);

  const handleFeatureTaskEnd = useCallback(() => {
    setIsIdentifyingFeatures(false);
  }, []);

  return (
    <EuiPanel hasBorder={true} hasShadow={false} paddingSize="none" grow={false}>
      <EuiPanel hasShadow={false} color="subdued">
        <EuiText size="s">
          <h3>
            {i18n.translate('xpack.streams.streamDetailView.streamDiscoveryTitle', {
              defaultMessage: 'Stream discovery',
            })}
          </h3>
        </EuiText>
      </EuiPanel>

      <EuiPanel hasShadow={false} hasBorder={false}>
        <EuiText size="s">
          <h4>
            {i18n.translate('xpack.streams.streamDetailView.featuresTitle', {
              defaultMessage: 'Features',
            })}
          </h4>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiFlexGroup direction="column" gutterSize="s">
          <Row
            left={
              <EuiText size="s" color="subdued">
                {i18n.translate('xpack.streams.streamDetailView.featureConfigurationDescription', {
                  defaultMessage:
                    'A stable fact about your system (such as infrastructure, technology, or service dependency) that is automatically extracted and validated from your log data. Extraction uses the last 24 hours of data.',
                })}
              </EuiText>
            }
            right={
              <EuiFlexGroup>
                <EuiFlexItem grow={false}>
                  <FeatureIdentificationControl
                    definition={definition}
                    refreshFeatures={refreshFeatures}
                    aiFeatures={aiFeatures}
                    isIdentifyingFeatures={isIdentifyingFeatures}
                    onTaskStart={handleFeatureTaskStart}
                    onTaskEnd={handleFeatureTaskEnd}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            }
          />
          {existingFeatures.length > 0 && (
            <>
              <EuiSpacer size="m" />
              <StreamFeaturesAccordion
                definition={definition}
                features={existingFeatures}
                isLoadingFeatures={featuresLoading}
                refreshFeatures={refreshFeatures}
                isIdentifyingFeatures={isIdentifyingFeatures}
                selectedFeature={selectedFeature}
                onSelectFeature={onSelectFeature}
              />
            </>
          )}
        </EuiFlexGroup>
      </EuiPanel>
    </EuiPanel>
  );
}
