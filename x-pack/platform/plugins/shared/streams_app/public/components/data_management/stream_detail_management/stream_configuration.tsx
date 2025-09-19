/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { Streams } from '@kbn/streams-schema';
import {
  EuiCard,
  EuiPanel,
  EuiText,
  useEuiTheme,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiSpacer,
} from '@elastic/eui';
import { StreamSystemsFlyout } from './stream_systems/stream_systems_flyout';
import { StreamSystemsAccordion } from './stream_systems/stream_systems_accordion';

interface StreamConfigurationProps {
  definition: Streams.ClassicStream.GetResponse;
}

export function StreamConfiguration({ definition }: StreamConfigurationProps) {
  const { euiTheme } = useEuiTheme();
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);

  return (
    <EuiPanel paddingSize="none">
      <EuiCard
        display="subdued"
        paddingSize="l"
        textAlign="left"
        css={{
          '& [class*="euiCard__description"]': {
            marginTop: '0',
          },
        }}
        title={
          <EuiText size="m" css={{ fontWeight: euiTheme.font.weight.semiBold }} color="inherit">
            {i18n.translate('xpack.streams.streamDetailView.configurationTitle', {
              defaultMessage: 'Stream configuration',
            })}
          </EuiText>
        }
      />
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
            <EuiButton iconType="sparkles" onClick={() => setIsFlyoutVisible(!isFlyoutVisible)}>
              {i18n.translate('xpack.streams.streamDetailView.systemDetection', {
                defaultMessage: 'System detection',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        <StreamSystemsAccordion definition={definition} />
        {isFlyoutVisible && (
          <StreamSystemsFlyout
            systems={[]}
            isLoading={false}
            closeFlyout={() => setIsFlyoutVisible(false)}
          />
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
}
