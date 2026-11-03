/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiFlyoutProps } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type {
  ActionPolicyTestDestination,
  ActionPolicyTestSendResponse,
} from '@kbn/alerting-v2-schemas';
import { FlyoutTemplate } from '@kbn/flyout-template';
import React from 'react';
import { DestinationTestResult } from './destination_test_result';
import * as labels from './translations';

interface Props {
  policyName: string;
  destinations: ActionPolicyTestDestination[];
  sendResponse: ActionPolicyTestSendResponse;
  /** Shared with the send flyout, so EUI links both in one history and renders Back. */
  historyKey: symbol;
  onClose: EuiFlyoutProps['onClose'];
}

const { Header, Body } = FlyoutTemplate;

/** The test runs started by a test notification, one row per workflow it was sent to. */
export const SendTestResultsFlyout = ({
  policyName,
  destinations,
  sendResponse,
  historyKey,
  onClose,
}: Props) => {
  const destinationsById = new Map(
    destinations.map((destination) => [destination.id, destination])
  );

  return (
    <FlyoutTemplate
      type="overlay"
      size="m"
      resizable
      ownFocus={false}
      session="start"
      historyKey={historyKey}
      onClose={onClose}
      data-test-subj="sendTestNotificationResultsFlyout"
    >
      <Header title={labels.RESULTS_TITLE} description={policyName} />
      <Body>
        <EuiFlexGroup
          direction="column"
          gutterSize="s"
          data-test-subj="sendTestNotificationResults"
        >
          {sendResponse.results.map((result) => (
            <EuiFlexItem key={result.workflow_id}>
              <DestinationTestResult
                destination={
                  destinationsById.get(result.workflow_id) ?? {
                    id: result.workflow_id,
                    executable: true,
                  }
                }
                result={result}
              />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </Body>
    </FlyoutTemplate>
  );
};
