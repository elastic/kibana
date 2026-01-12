/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { Streams } from '@kbn/streams-schema';
import { EuiPanel, EuiText, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { useStreamFeatures } from './stream_features/hooks/use_stream_features';
import { StreamFeaturesAccordion } from './stream_features/stream_features_accordion';
import { Row } from '../data_management/stream_detail_management/advanced_view/row';
import { FeatureIdentificationControl } from '../stream_detail_significant_events_view/feature_identification_control';
import type { AIFeatures } from '../../hooks/use_ai_features';

interface StreamConfigurationProps {
  definition: Streams.all.Definition;
  aiFeatures: AIFeatures | null;
}

export function StreamFeatureConfiguration({ definition, aiFeatures }: StreamConfigurationProps) {
  const {
    features: existingFeatures,
    refreshFeatures,
    featuresLoading,
  } = useStreamFeatures(definition.name);

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

      <EuiPanel hasShadow={false} hasBorder={false}>
        <EuiFlexGroup direction="column" gutterSize="s">
          <Row
            left={
              <EuiText size="s" color="subdued">
                {i18n.translate('xpack.streams.streamDetailView.configurationDescription', {
                  defaultMessage:
                    'Use AI to generate logical subsets of the data in this stream. You will find useful insights like programming language, operating system, cloud provider etc. This is useful for generating better significant events. Generation uses the last 24 hours of data.',
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
                loading={featuresLoading}
                refresh={refreshFeatures}
                aiFeatures={aiFeatures}
              />
            </>
          )}
        </EuiFlexGroup>
      </EuiPanel>
    </EuiPanel>
  );
}
