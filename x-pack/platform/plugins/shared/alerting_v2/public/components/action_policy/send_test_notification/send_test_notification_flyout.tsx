/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiText } from '@elastic/eui';
import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
import { normalizeMatcher } from '@kbn/alerting-v2-utils';
import { FlyoutTemplate } from '@kbn/flyout-template';
import React, { useState } from 'react';
import { usePreviewTestNotification } from '../../../hooks/use_preview_test_notification';
import { useSendTestNotification } from '../../../hooks/use_send_test_notification';
import { DestinationTestCard } from './destination_test_card';
import { PayloadEditor } from './payload_editor';
import { SendTestResultsFlyout } from './send_test_results_flyout';
import * as labels from './translations';
import { validatePayload } from './validate_payload';

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
    reset: resetSend,
  } = useSendTestNotification(policy.id);
  const [deselectedIds, setDeselectedIds] = useState<ReadonlySet<string>>(new Set());
  const [editedPayload, setEditedPayload] = useState<string>();
  const [ownHistoryKey] = useState(() => Symbol('sendTestNotificationFlyout'));
  const flyoutHistoryKey = historyKey ?? ownHistoryKey;

  const destinations = preview?.destinations ?? [];
  const selectedIds = destinations
    .filter(({ id, executable }) => executable && !deselectedIds.has(id))
    .map(({ id }) => id);
  const generatedPayload = preview?.groups[0];
  const generatedPayloadText = generatedPayload ? JSON.stringify(generatedPayload, null, 2) : '';
  const payloadText = editedPayload ?? generatedPayloadText;
  const { payload, errors: payloadErrors } = generatedPayload
    ? validatePayload(payloadText)
    : { payload: undefined, errors: [] };
  const hasKqlMatcher = Boolean(normalizeMatcher(policy.matcher)?.expression);

  const toggleDestination = (id: string) =>
    setDeselectedIds((current) => {
      const next = new Set(current);
      if (!next.delete(id)) {
        next.add(id);
      }
      return next;
    });

  const send = () => {
    if (!payload) {
      return;
    }
    sendTestNotification({ payload, destinationIds: selectedIds });
  };

  return (
    <>
      <FlyoutTemplate
        type="overlay"
        size="m"
        resizable
        ownFocus={false}
        session="start"
        historyKey={flyoutHistoryKey}
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
            {generatedPayload ? (
              <PayloadEditor
                value={payloadText}
                generatedValue={generatedPayloadText}
                errors={payloadErrors}
                onChange={setEditedPayload}
                onReset={() => setEditedPayload(undefined)}
              />
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
                    disabled={!destination.executable || isSending}
                    onChange={() => toggleDestination(destination.id)}
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
            isDisabled={!payload || selectedIds.length === 0}
            data-test-subj="sendTestNotificationSendButton"
          />
        </Footer>
      </FlyoutTemplate>
      {sendResponse && (
        <SendTestResultsFlyout
          policyName={policy.name}
          destinations={destinations}
          sendResponse={sendResponse}
          historyKey={flyoutHistoryKey}
          onClose={resetSend}
        />
      )}
    </>
  );
};
