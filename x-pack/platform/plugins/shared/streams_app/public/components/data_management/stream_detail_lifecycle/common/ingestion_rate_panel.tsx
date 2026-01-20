/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiPanel, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { StreamsAppSearchBar } from '../../../streams_app_search_bar';

interface IngestionRatePanelProps {
  isLoading: boolean;
  hasAggregations: boolean;
  children: React.ReactNode;
}

export function IngestionRatePanel({
  isLoading,
  hasAggregations,
  children,
}: IngestionRatePanelProps) {
  return (
    <EuiPanel
      hasShadow={false}
      hasBorder
      paddingSize="m"
      grow={false}
      css={{ height: '100%', minHeight: '256px' }}
    >
      <EuiFlexGroup direction="column" gutterSize="none" css={{ height: '100%' }}>
        <EuiFlexItem grow={false}>
          <EuiPanel hasShadow={false} hasBorder={false} paddingSize="s">
            <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
              <EuiFlexItem grow={3}>
                <EuiFlexGroup gutterSize="s" alignItems="center">
                  <EuiFlexItem grow={false}>
                    <EuiText>
                      <h5>
                        {i18n.translate('xpack.streams.streamDetailLifecycle.ingestionRatePanel', {
                          defaultMessage: 'Ingestion over time',
                        })}
                      </h5>
                    </EuiText>
                  </EuiFlexItem>

                  <EuiFlexItem grow={false}>
                    {isLoading && hasAggregations && <EuiLoadingSpinner size="s" />}
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                <StreamsAppSearchBar showDatePicker />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>

        <EuiFlexItem grow css={{ minHeight: '200px' }}>
          {children}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
