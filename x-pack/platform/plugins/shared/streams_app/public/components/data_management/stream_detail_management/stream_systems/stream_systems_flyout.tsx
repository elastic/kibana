/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
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
  EuiLoadingElastic,
} from '@elastic/eui';
import type { Streams, System } from '@kbn/streams-schema';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/css';
import { useWaitingForAiMessage } from '../../../../hooks/use_waiting_for_ai_message';
import { useStreamSystemsApi } from '../../../../hooks/use_stream_systems_api';
import { StreamSystemsTable } from './stream_systems_table';

export const StreamSystemsFlyout = ({
  systems,
  closeFlyout,
  isLoading,
  definition,
}: {
  isLoading: boolean;
  systems: System[];
  closeFlyout: () => void;
  definition: Streams.all.Definition;
}) => {
  const [selectedSystems, setSelectedSystems] = useState<System[]>([]);
  const { addSystemsToStream } = useStreamSystemsApi(definition);
  const [isUpdating, setIsUpdating] = useState(false);

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
              defaultMessage="System identification"
            />
          </h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText color="subdued">
          <p>
            <FormattedMessage
              id="xpack.streams.streamSystemsFlyout.description"
              defaultMessage="We analyzed your stream and identified the following systems. Select the ones you want to add to your stream."
            />
          </p>
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody
        className={css`
          & .euiFlyoutBody__overflowContent {
            height: 100%;
          }
        `}
      >
        {!isLoading ? (
          <StreamSystemsTable
            systems={systems}
            selectedSystems={selectedSystems}
            setSelectedSystems={setSelectedSystems}
            definition={definition}
          />
        ) : (
          <LoadingState />
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              isLoading={isUpdating}
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
            <EuiButton
              isLoading={isUpdating}
              onClick={() => {
                setIsUpdating(true);
                addSystemsToStream(selectedSystems).finally(() => {
                  closeFlyout();
                  setIsUpdating(false);
                });
              }}
              fill
              isDisabled={selectedSystems.length === 0}
            >
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

function LoadingState() {
  const label = useWaitingForAiMessage();

  return (
    <EuiFlexGroup
      direction="column"
      alignItems="center"
      justifyContent="center"
      css={{ height: '100%' }}
    >
      <EuiFlexItem grow={false} css={{ textAlign: 'center' }}>
        <EuiLoadingElastic size="xxl" />
        <EuiSpacer size="m" />
        <EuiText>{label}</EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
