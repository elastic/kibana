/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel, EuiSpacer } from '@elastic/eui';
import type {
  ActionPolicyTestDestination,
  ActionPolicyTestSendResult,
} from '@kbn/alerting-v2-schemas';
import React from 'react';
import { DestinationLabel, useDestinationWorkflow } from './destination_label';
import { DestinationTestStatus } from './destination_test_status';

interface Props {
  destination: ActionPolicyTestDestination;
  result: ActionPolicyTestSendResult;
}

/** A destination the test notification was sent to, with the status of its test run. */
export const DestinationTestResult = ({ destination, result }: Props) => {
  const workflow = useDestinationWorkflow(destination, { notifyOnError: false });

  return (
    <EuiPanel
      hasBorder
      paddingSize="m"
      data-test-subj={`sendTestNotificationResult-${result.workflow_id}`}
    >
      <DestinationLabel destination={destination} workflow={workflow} />
      <EuiSpacer size="s" />
      <DestinationTestStatus result={result} />
    </EuiPanel>
  );
};
