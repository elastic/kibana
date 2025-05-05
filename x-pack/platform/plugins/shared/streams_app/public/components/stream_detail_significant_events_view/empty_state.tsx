/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButton, EuiFlexGroup, EuiText, EuiTitle } from '@elastic/eui';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { AssetImage } from '../asset_image';

export function SignificantEventsViewEmptyState({
  onGenerateClick,
  onAddClick,
}: {
  onGenerateClick?: () => Promise<void>;
  onAddClick?: () => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  return (
    <EuiFlexGroup direction="column" alignItems="center" justifyContent="center">
      <AssetImage type="significantEventsEmptyState" size="s" />
      <EuiTitle size="s">
        <h2>
          {i18n.translate('xpack.significantEvents.emptyState.title', {
            defaultMessage: 'No significant event definitions',
          })}
        </h2>
      </EuiTitle>
      <EuiText size="s" textAlign="center">
        {i18n.translate('xpack.significantEvents.emptyState.description', {
          defaultMessage:
            'There are no significant events defined for this stream. We can generate these events for you, based on historical data.',
        })}
      </EuiText>
      <EuiFlexGroup direction="row" gutterSize="s">
        <EuiButton
          isLoading={isLoading}
          iconType="sparkles"
          onClick={() => {
            setIsLoading(true);
            onGenerateClick?.().finally(() => {
              setIsLoading(false);
            });
          }}
        >
          {i18n.translate('xpack.streams.significantEvents.emptyState.generateEvents', {
            defaultMessage: 'Generate events',
          })}
        </EuiButton>
        <EuiButton
          isLoading={isLoading}
          iconType="plusInCircle"
          fill
          onClick={() => {
            onAddClick?.();
          }}
        >
          {i18n.translate('xpack.streams.significantEvents.emptyState.addEvent', {
            defaultMessage: 'Add new event',
          })}
        </EuiButton>
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
}
