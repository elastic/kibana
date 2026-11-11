/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import type { ActionPolicyTestDestination } from '@kbn/alerting-v2-schemas';
import type { WorkflowDetailDto } from '@kbn/workflows';
import React from 'react';
import { useFetchWorkflow } from '../../../hooks/use_fetch_workflow';
import {
  getWorkflowConnectorTypes,
  WorkflowConnectorIcons,
} from '../details_flyout/workflow_connector_icons';
import * as labels from './translations';

/**
 * The workflow of a destination, fetched only when the user can read it.
 * A failed fetch is reported once, by the observer that sets `notifyOnError`.
 */
export const useDestinationWorkflow = (
  { id, name }: ActionPolicyTestDestination,
  { notifyOnError }: { notifyOnError: boolean }
) => useFetchWorkflow(id, name !== undefined, { notifyOnError }).data;

interface Props {
  destination: ActionPolicyTestDestination;
  workflow?: WorkflowDetailDto;
}

/** The name, connector icons and executable state of a test notification destination. */
export const DestinationLabel = ({ destination, workflow }: Props) => {
  const { id, name, executable } = destination;
  const connectorTypes = getWorkflowConnectorTypes(workflow?.definition);

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} component="span">
      <EuiFlexItem grow={false} component="span" css={{ minWidth: 0 }}>
        <EuiText size="s" component="span" className="eui-textTruncate">
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
  );
};
