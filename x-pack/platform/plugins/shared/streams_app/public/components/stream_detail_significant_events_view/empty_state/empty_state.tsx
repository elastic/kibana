/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { AssetImage } from '../../asset_image';

export function SignificantEventsViewEmptyState({ onAddClick }: { onAddClick: () => void }) {
  return (


  <EuiEmptyPrompt
    icon={<AssetImage size="m" type="significantEventsEmptyState" />}
    titleSize="s"
    title={
        <h2>
          {i18n.translate('xpack.streams.significantEvents.emptyState.title', {
            defaultMessage: 'Generate significant events',
          })}
        </h2>
    }
    body={i18n.translate('xpack.streams.streamDetail.preview.editPreviewMessageEmptyDescription', {
      defaultMessage:
        'Currently there are no significant events for this stream, use AI to generate queries and significant events, to observe every change in your data.',
    })}
    actions={
        <EuiButton iconType="plusInCircle" fill onClick={() => onAddClick()}>
          {i18n.translate('xpack.streams.significantEvents.emptyState.addEvent', {
            defaultMessage: 'Add new event',
          })}
        </EuiButton>
    }
  />
  );
}
