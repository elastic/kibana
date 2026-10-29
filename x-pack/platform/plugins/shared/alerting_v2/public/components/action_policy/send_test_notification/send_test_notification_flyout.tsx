/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiCheckbox,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiText,
} from '@elastic/eui';
import type { ActionPolicyResponse, ActionPolicyTestDestination } from '@kbn/alerting-v2-schemas';
import { FlyoutTemplate } from '@kbn/flyout-template';
import React, { useState } from 'react';
import { usePreviewTestNotification } from '../../../hooks/use_preview_test_notification';
import { useSendTestNotification } from '../../../hooks/use_send_test_notification';
import { DestinationTestStatus } from './destination_test_status';
import * as labels from './translations';

interface Props {
  policy: ActionPolicyResponse;
  onClose: () => void;
  /** Shared with the flyout that opened this one, so EUI links both in one history. */
  historyKey?: symbol;
}

const { Header, Body, Footer } = FlyoutTemplate;

export const SendTestNotificationFlyout = ({ policy, onClose, historyKey }: Props) => {
  const { data: preview, isLoading, error } = usePreviewTestNotification(policy.id);
  const {
    mutate: sendTestNotification,
    data: sendResponse,
    isLoading: isSending,
  } = useSendTestNotification(policy.id);
  const [deselectedIds, setDeselectedIds] = useState<ReadonlySet<string>>(new Set());

  const destinations = preview?.destinations ?? [];
  const selectedIds = destinations
    .filter(({ id, executable }) => executable && !deselectedIds.has(id))
    .map(({ id }) => id);
  const group = preview?.status === 'ok' ? preview.groups[0] : undefined;
  const resultsByWorkflowId = new Map(
    (sendResponse?.results ?? []).map((result) => [result.workflow_id, result])
  );

  const toggleDestination = (id: string) =>
    setDeselectedIds((current) => {
      const next = new Set(current);
      if (!next.delete(id)) {
        next.add(id);
      }
      return next;
    });

  const send = () => {
    if (preview?.status !== 'ok') {
      return;
    }
    sendTestNotification({ seed: preview.seed, destinationIds: selectedIds });
  };

  return (
    <FlyoutTemplate
      type="overlay"
      size="m"
      resizable
      ownFocus={false}
      session="start"
      historyKey={historyKey}
      onClose={onClose}
      data-test-subj="sendTestNotificationFlyout"
    >
      <Header title={labels.FLYOUT_TITLE} description={policy.name} />
      <Body>
        <Body.Callout
          id="syntheticData"
          level="info"
          title={labels.SYNTHETIC_DATA_TITLE}
          text={labels.SYNTHETIC_DATA_TEXT}
          data-test-subj="sendTestNotificationSyntheticDataCallout"
        />
        <Body.Callout
          id="realChannels"
          level="warning"
          title={labels.REAL_CHANNELS_TITLE}
          text={labels.REAL_CHANNELS_TEXT}
          data-test-subj="sendTestNotificationRealChannelsCallout"
        />
        {preview?.status === 'unsupported' && (
          <Body.Callout
            id="unsupported"
            level="warning"
            title={labels.UNSUPPORTED_MATCHER_TITLE}
            text={labels.UNSUPPORTED_MATCHER_TEXT}
            data-test-subj="sendTestNotificationUnsupportedCallout"
          />
        )}
        {error && (
          <Body.Callout
            id="previewError"
            level="danger"
            title={labels.PREVIEW_ERROR_TITLE}
            text={error.message}
            data-test-subj="sendTestNotificationPreviewErrorCallout"
          />
        )}
        {isLoading && <EuiLoadingSpinner size="l" />}
        <Body.Section
          id="destinations"
          title={labels.DESTINATIONS_TITLE}
          hasBorder
          data-test-subj="sendTestNotificationDestinations"
        >
          <EuiFlexGroup direction="column" gutterSize="s">
            {destinations.map((destination) => {
              const result = resultsByWorkflowId.get(destination.id);
              return (
                <EuiFlexItem key={destination.id}>
                  <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                    <EuiFlexItem>
                      <EuiCheckbox
                        id={`sendTestNotificationDestination-${destination.id}`}
                        label={<DestinationLabel destination={destination} />}
                        checked={destination.executable && !deselectedIds.has(destination.id)}
                        disabled={!destination.executable || isSending}
                        onChange={() => toggleDestination(destination.id)}
                        data-test-subj={`sendTestNotificationDestination-${destination.id}`}
                      />
                    </EuiFlexItem>
                    {result && (
                      <EuiFlexItem grow={false}>
                        <DestinationTestStatus result={result} />
                      </EuiFlexItem>
                    )}
                  </EuiFlexGroup>
                </EuiFlexItem>
              );
            })}
          </EuiFlexGroup>
        </Body.Section>
        <Body.Section
          id="payload"
          title={labels.PAYLOAD_TITLE}
          data-test-subj="sendTestNotificationPayload"
        >
          {group ? (
            <EuiCodeBlock
              language="json"
              fontSize="s"
              paddingSize="m"
              overflowHeight={480}
              isCopyable
              data-test-subj="sendTestNotificationPayloadCode"
            >
              {JSON.stringify(group.payload, null, 2)}
            </EuiCodeBlock>
          ) : (
            <EuiText size="s" color="subdued">
              <p>{labels.NO_PAYLOAD}</p>
            </EuiText>
          )}
        </Body.Section>
      </Body>
      <Footer>
        <Footer.SecondaryAction
          label={labels.CLOSE}
          onClick={onClose}
          data-test-subj="sendTestNotificationCloseButton"
        />
        <Footer.PrimaryAction
          label={labels.SEND}
          iconType="send"
          onClick={send}
          isLoading={isSending}
          isDisabled={!group || selectedIds.length === 0}
          tooltip={preview?.status === 'unsupported' ? labels.UNSUPPORTED_MATCHER_TITLE : undefined}
          data-test-subj="sendTestNotificationSendButton"
        />
      </Footer>
    </FlyoutTemplate>
  );
};

const DestinationLabel = ({ destination }: { destination: ActionPolicyTestDestination }) => (
  <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} component="span">
    <EuiFlexItem grow={false} component="span">
      {destination.name ?? destination.id}
    </EuiFlexItem>
    {!destination.executable && (
      <EuiFlexItem grow={false} component="span">
        <EuiBadge
          color="hollow"
          title={labels.NOT_EXECUTABLE_TOOLTIP}
          data-test-subj={`sendTestNotificationNotExecutable-${destination.id}`}
        >
          {labels.NOT_EXECUTABLE}
        </EuiBadge>
      </EuiFlexItem>
    )}
  </EuiFlexGroup>
);
