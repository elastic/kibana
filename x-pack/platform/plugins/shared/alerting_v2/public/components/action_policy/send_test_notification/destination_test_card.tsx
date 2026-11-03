/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiCheckableCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import type {
  ActionPolicyTestDestination,
  ActionPolicyTestSendResult,
} from '@kbn/alerting-v2-schemas';
import React from 'react';
import { useFetchWorkflow } from '../../../hooks/use_fetch_workflow';
import {
  getWorkflowConnectorTypes,
  WorkflowConnectorIcons,
} from '../details_flyout/workflow_connector_icons';
import { DestinationTestStatus } from './destination_test_status';
import * as labels from './translations';

const TRUNCATE_CSS = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
} as const;

interface Props {
  destination: ActionPolicyTestDestination;
  checked: boolean;
  disabled: boolean;
  onChange: () => void;
  /** The test run started for this destination, once sent. */
  result?: ActionPolicyTestSendResult;
}

/** A selectable destination of the test notification, with the status of its test run. */
export const DestinationTestCard = ({
  destination,
  checked,
  disabled,
  onChange,
  result,
}: Props) => {
  const { id, name, executable } = destination;
  // A destination without a name could not be read by the user, so it is not fetched either.
  const { data: workflow } = useFetchWorkflow(id, name !== undefined);
  const connectorTypes = getWorkflowConnectorTypes(workflow?.definition);
  const description = workflow?.description;

  return (
    <EuiCheckableCard
      id={`sendTestNotificationDestination-${id}`}
      checkableType="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={onChange}
      data-test-subj={`sendTestNotificationDestination-${id}`}
      label={
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} component="span">
          <EuiFlexItem grow={false} component="span" css={{ minWidth: 0 }}>
            <EuiText size="s" component="span" css={TRUNCATE_CSS}>
              <strong>{name ?? id}</strong>
            </EuiText>
          </EuiFlexItem>
          {connectorTypes.length > 0 && (
            <EuiFlexItem grow={false} component="span">
              <WorkflowConnectorIcons types={connectorTypes} />
            </EuiFlexItem>
          )}
          {!executable && (
            <EuiFlexItem grow={false} component="span">
              <EuiBadge
                color="hollow"
                title={labels.NOT_EXECUTABLE_TOOLTIP}
                data-test-subj={`sendTestNotificationNotExecutable-${id}`}
              >
                {labels.NOT_EXECUTABLE}
              </EuiBadge>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      }
    >
      {description && (
        <EuiText size="xs" color="subdued" css={TRUNCATE_CSS}>
          {description}
        </EuiText>
      )}
      {result && (
        <>
          {description && <EuiSpacer size="s" />}
          <DestinationTestStatus result={result} />
        </>
      )}
    </EuiCheckableCard>
  );
};
