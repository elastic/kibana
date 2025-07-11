/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButton, EuiFlexGroup, EuiText, EuiTitle } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { AssetImage } from '../asset_image';

export function SignificantEventsViewEmptyState({
  onAddClick,
  onGenerateClick,
}: {
  onAddClick?: () => void;
  onGenerateClick?: () => void;
}) {
  return (
    <EuiFlexGroup direction="column" alignItems="center" justifyContent="center">
      <AssetImage type="significantEventsEmptyState" size="s" />
      <EuiTitle size="s">
        <h2>
          {i18n.translate('xpack.streams.significantEvents.emptyState.title', {
            defaultMessage: 'No significant event definitions',
          })}
        </h2>
      </EuiTitle>
      <EuiText size="s" textAlign="center">
        {i18n.translate('xpack.streams.significantEvents.emptyState.description', {
          defaultMessage: 'There are no significant events defined for this stream yet.',
        })}
      </EuiText>
      <EuiFlexGroup direction="row" gutterSize="s">
        <EuiButton
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
        <EuiButton
          iconType="sparkles"
          fill
          onClick={() => {
            onGenerateClick?.();
          }}
        >
          {i18n.translate('xpack.streams.significantEvents.emptyState.generateEvents', {
            defaultMessage: 'Generate new events',
          })}
        </EuiButton>
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
}
