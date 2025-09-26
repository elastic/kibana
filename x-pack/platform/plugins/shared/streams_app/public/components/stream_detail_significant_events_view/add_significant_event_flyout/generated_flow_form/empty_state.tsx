/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiSpacer, EuiTitle, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { AssetImage } from '../../../asset_image';

export function AiFlowEmptyState() {
  return (
    <EuiFlexGroup
      direction="column"
      alignItems="center"
      justifyContent="center"
      style={{ minHeight: '60vh' }}
    >
      <EuiSpacer size="m" />
      <AssetImage type="extractFields" size="m" />
      <EuiTitle size="s">
        <h2>
          {i18n.translate('xpack.streams.addSignificantEventFlyout.aiFlow.emptyState.title', {
            defaultMessage: 'Your preview will appear here',
          })}
        </h2>
      </EuiTitle>
      <EuiText size="s" textAlign="center" css={{ maxWidth: 480 }}>
        {i18n.translate('xpack.streams.addSignificantEventFlyout.aiFlow.emptyState.description', {
          defaultMessage:
            'You can generate events with AI, by giving context through systems selection. Manual entry is also available.',
        })}
      </EuiText>
    </EuiFlexGroup>
  );
}
