/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { Streams, Feature } from '@kbn/streams-schema';
import { EuiPanel, EuiText, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { useStreamFeatures } from './stream_features/hooks/use_stream_features';
import type { AIFeatures } from '../../hooks/use_ai_features';
import { useStreamFeaturesApi } from '../../hooks/use_stream_features_api';
import { StreamFeaturesFlyout } from './stream_features/stream_features_flyout';
import { StreamFeaturesAccordion } from './stream_features/stream_features_accordion';
import { Row } from '../data_management/stream_detail_management/advanced_view/row';
import { ConnectorListButtonBase } from '../connector_list_button/connector_list_button';
import { useKibana } from '../../hooks/use_kibana';

interface StreamConfigurationProps {
  definition: Streams.all.Definition;
  aiFeatures: AIFeatures | null;
}

export function StreamFeatureConfiguration({ definition, aiFeatures }: StreamConfigurationProps) {
  const {
    core: { notifications },
  } = useKibana();
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);
  const { identifyFeatures, abort } = useStreamFeaturesApi(definition);
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
                  <ConnectorListButtonBase
                    buttonProps={{
                      size: 'm',
                      iconType: 'sparkles',
                      onClick: () => {
                        setIsLoading(true);
                        setIsFlyoutVisible(!isFlyoutVisible);
                        identifyFeatures(aiFeatures?.genAiConnectors.selectedConnector!)
                          .then((data) => {
                            setFeatures(data.features);
                          })
                          .catch((error) => {
                            if (error.name === 'AbortError') {
                              return;
                            }
                            notifications.toasts.addError(error, {
                              title: i18n.translate(
                                'xpack.streams.streamDetailView.featureIdentification.errorTitle',
                                { defaultMessage: 'Failed to identify features' }
                              ),
                            });
                          })
                          .finally(() => {
                            setIsLoading(false);
                          });
                      },
                      'data-test-subj': 'feature_identification_identify_features_button',
                      children: i18n.translate(
                        'xpack.streams.streamDetailView.featureIdentificationButtonLabel',
                        {
                          defaultMessage: 'Identify features',
                        }
                      ),
                    }}
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
    </EuiPanel>
  );
}
