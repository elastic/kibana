/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiEmptyPrompt, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

export function RoutingErrorPrompt({ edge, onClose }: { edge: string; onClose: () => void }) {
  return (
    <EuiEmptyPrompt
      iconType="magnify"
      title={
        <h2>
          {i18n.translate('xpack.streams.routing.flyout.error.title', {
            defaultMessage: 'Route not found',
          })}
        </h2>
      }
      body={
        <EuiText data-test-subj="streamRouteNotFoundPromptBody">
          <p>
            <FormattedMessage
              id="xpack.streams.routing.flyout.error.body"
              defaultMessage="We could not load route {routeName}. It may have been deleted. Open the streams list to see your streams or create this route again."
              values={{ routeName: <strong>{edge}</strong> }}
            />
          </p>
        </EuiText>
      }
      actions={
        <EuiButton data-test-subj="streamRouteNotFoundCloseButton" fill onClick={onClose}>
          {i18n.translate('xpack.streams.routing.flyout.error.closeButton', {
            defaultMessage: 'Go back to stream canvas',
          })}
        </EuiButton>
      }
    />
  );
}
