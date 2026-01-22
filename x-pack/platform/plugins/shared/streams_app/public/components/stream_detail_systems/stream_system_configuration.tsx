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
import { useStreamSystems } from './stream_systems/hooks/use_stream_systems';
import { StreamSystemsAccordion } from './stream_systems/stream_systems_accordion';
import { Row } from '../data_management/stream_detail_management/advanced_view/row';
import { SystemIdentificationControl } from '../stream_detail_significant_events_view/system_identification_control';
import type { AIFeatures } from '../../hooks/use_ai_features';

interface StreamConfigurationProps {
  definition: Streams.all.Definition;
  aiFeatures: AIFeatures | null;
}

export function StreamSystemConfiguration({ definition, aiFeatures }: StreamConfigurationProps) {
  const {
    systems: existingSystems,
    refreshSystems,
    systemsLoading,
  } = useStreamSystems(definition.name);

  return (
    <EuiPanel hasBorder={true} hasShadow={false} paddingSize="none" grow={false}>
      <EuiPanel hasShadow={false} color="subdued">
        <EuiText size="s">
          <h3>
            {i18n.translate('xpack.streams.streamDetailView.systemConfigurationTitle', {
              defaultMessage: 'System identification',
            })}
          </h3>
        </EuiText>
      </EuiPanel>

      <EuiPanel hasShadow={false} hasBorder={false}>
        <EuiFlexGroup direction="column" gutterSize="s">
          <Row
            left={
              <EuiText size="s" color="subdued">
                {i18n.translate('xpack.streams.streamDetailView.systemConfigurationDescription', {
                  defaultMessage:
                    'Use AI to generate logical subsets of the data in this stream. You will find useful insights like programming language, operating system, cloud provider etc. This is useful for generating better significant events. Generation uses the last 24 hours of data.',
                })}
              </EuiText>
            }
            right={
              <EuiFlexGroup>
                <EuiFlexItem grow={false}>
                  <SystemIdentificationControl
                    definition={definition}
                    refreshSystems={refreshSystems}
                    aiFeatures={aiFeatures}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            }
          />
          {existingSystems.length > 0 && (
            <>
              <EuiSpacer size="m" />
              <StreamSystemsAccordion
                definition={definition}
                systems={existingSystems}
                loading={systemsLoading}
                refresh={refreshSystems}
                aiFeatures={aiFeatures}
              />
            </>
          )}
        </EuiFlexGroup>
      </EuiPanel>
    </EuiPanel>
  );
}
