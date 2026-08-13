/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonIcon,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FlyoutToolbarHeader } from '../../../../components/flyout_components/flyout_toolbar_header';
import { StreamsView } from './streams_view';

export function StreamsStatusFlyout({ onClose }: { onClose: () => void }): React.ReactElement {
  const flyoutTitleId = useGeneratedHtmlId({ prefix: 'streamsStatusFlyoutTitle' });
  const closeLabel = i18n.translate('xpack.significantEventsApp.streamsStatusFlyoutCloseLabel', {
    defaultMessage: 'Close streams status',
  });

  return (
    <EuiFlyout
      onClose={onClose}
      aria-labelledby={flyoutTitleId}
      size="l"
      hideCloseButton
      data-test-subj="significantEventsStreamsStatusFlyout"
    >
      <FlyoutToolbarHeader>
        <EuiFlexItem grow={false}>
          <EuiToolTip content={closeLabel} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="cross"
              color="text"
              aria-label={closeLabel}
              onClick={onClose}
              data-test-subj="significantEventsStreamsStatusFlyoutCloseButton"
            />
          </EuiToolTip>
        </EuiFlexItem>
      </FlyoutToolbarHeader>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id={flyoutTitleId}>
            {i18n.translate('xpack.significantEventsApp.streamsStatusFlyoutTitle', {
              defaultMessage: 'Streams status',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <StreamsView compact />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
}
