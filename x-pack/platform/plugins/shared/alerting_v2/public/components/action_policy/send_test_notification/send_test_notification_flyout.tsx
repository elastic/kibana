/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCodeBlock, EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiText } from '@elastic/eui';
import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
import { normalizeMatcher } from '@kbn/alerting-v2-utils';
import { FlyoutTemplate } from '@kbn/flyout-template';
import React, { useState } from 'react';
import { usePreviewTestNotification } from '../../../hooks/use_preview_test_notification';
import { useSendTestNotification } from '../../../hooks/use_send_test_notification';
import { DestinationTestCard } from './destination_test_card';
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
  const payload = preview?.groups[0];
  const hasKqlMatcher = Boolean(normalizeMatcher(policy.matcher)?.expression);
  // Once sent, the form stays locked so the same workflows are not started again by accident.
  const isSent = sendResponse !== undefined;
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
    if (!preview) {
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
          id="realChannels"
          level="warning"
          title={labels.REAL_CHANNELS_TITLE}
          text={labels.REAL_CHANNELS_TEXT}
          data-test-subj="sendTestNotificationRealChannelsCallout"
        />
        <Body.Callout
          id="syntheticValues"
          level="info"
          title={labels.SYNTHETIC_VALUES_TITLE}
          text={hasKqlMatcher ? labels.SYNTHETIC_VALUES_KQL_TEXT : labels.SYNTHETIC_VALUES_TEXT}
          data-test-subj="sendTestNotificationSyntheticValuesCallout"
        />
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
          id="payload"
          title={labels.PAYLOAD_TITLE}
          data-test-subj="sendTestNotificationPayload"
        >
          {payload ? (
            <EuiCodeBlock
              language="json"
              fontSize="s"
              paddingSize="m"
              overflowHeight={480}
              isCopyable
              data-test-subj="sendTestNotificationPayloadCode"
            >
              {JSON.stringify(payload, null, 2)}
            </EuiCodeBlock>
          ) : (
            <EuiText size="s" color="subdued">
              <p>{labels.NO_PAYLOAD}</p>
            </EuiText>
          )}
        </Body.Section>
        <Body.Section
          id="destinations"
          title={labels.DESTINATIONS_TITLE}
          data-test-subj="sendTestNotificationDestinations"
        >
          <EuiFlexGroup direction="column" gutterSize="s">
            {destinations.map((destination) => (
              <EuiFlexItem key={destination.id}>
                <DestinationTestCard
                  destination={destination}
                  checked={destination.executable && !deselectedIds.has(destination.id)}
                  disabled={!destination.executable || isSending || isSent}
                  onChange={() => toggleDestination(destination.id)}
                  result={resultsByWorkflowId.get(destination.id)}
                />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
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
          isDisabled={!payload || selectedIds.length === 0 || isSent}
          data-test-subj="sendTestNotificationSendButton"
        />
      </Footer>
    </FlyoutTemplate>
  );
};
