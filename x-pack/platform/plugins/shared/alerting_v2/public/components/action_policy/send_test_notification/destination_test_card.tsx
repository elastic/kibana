/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCheckableCard, EuiText } from '@elastic/eui';
import type { ActionPolicyTestDestination } from '@kbn/alerting-v2-schemas';
import React from 'react';
import { DestinationLabel, useDestinationWorkflow } from './destination_label';

interface Props {
  destination: ActionPolicyTestDestination;
  checked: boolean;
  disabled: boolean;
  onChange: () => void;
}

/** A selectable destination of the test notification. */
export const DestinationTestCard = ({ destination, checked, disabled, onChange }: Props) => {
  const { id } = destination;
  const workflow = useDestinationWorkflow(destination, { notifyOnError: true });
  const description = workflow?.description;

  return (
    <EuiCheckableCard
      id={`sendTestNotificationDestination-${id}`}
      checkableType="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={onChange}
      data-test-subj={`sendTestNotificationDestination-${id}`}
      label={<DestinationLabel destination={destination} workflow={workflow} />}
    >
      {description && (
        <EuiText size="xs" color="subdued" className="eui-textTruncate">
          {description}
        </EuiText>
      )}
    </EuiCheckableCard>
  );
};
