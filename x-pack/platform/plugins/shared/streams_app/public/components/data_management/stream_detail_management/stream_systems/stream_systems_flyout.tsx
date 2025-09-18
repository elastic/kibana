/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { System } from '@kbn/streams-schema';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { StreamSystemsTable } from './stream_systems_table';

export const StreamSystemsFlyout = ({
  systems,
  closeFlyout,
  isLoading,
}: {
  isLoading: boolean;
  systems: System[];
  closeFlyout: () => void;
}) => {
  const addToStream = () => {};
  return (
    <EuiFlyout
      ownFocus
      onClose={closeFlyout}
      hideCloseButton
      aria-label={i18n.translate('xpack.streams.streamSystemsFlyout.flyoutAriaLabel', {
        defaultMessage: 'Stream description',
      })}
      size="l"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            <FormattedMessage
              id="xpack.streams.streamSystemsFlyout.title"
              defaultMessage="Stream description"
            />
          </h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText color="subdued">
          <p>
            <FormattedMessage
              id="xpack.streams.streamSystemsFlyout.description"
              defaultMessage="Stream description is used to provide context to Elastic, so we could analyse, generate and work better with your data. We use this information to provide significant events and other insights."
            />
          </p>
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {!isLoading ? (
          <StreamSystemsTable systems={systems} />
        ) : (
          <p>
            <FormattedMessage
              id="xpack.streams.streamSystemsFlyout.loading"
              defaultMessage="Loading..."
            />
          </p>
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="cross"
              onClick={closeFlyout}
              flush="left"
              aria-label={i18n.translate('xpack.streams.streamSystemsFlyout.closeButtonAriaLabel', {
                defaultMessage: 'Close flyout',
              })}
            >
              <FormattedMessage
                id="xpack.streams.streamSystemsFlyout.closeButton"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton onClick={addToStream} fill>
              <FormattedMessage
                id="xpack.streams.streamSystemsFlyout.addToStreamButton"
                defaultMessage="Add to stream"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
