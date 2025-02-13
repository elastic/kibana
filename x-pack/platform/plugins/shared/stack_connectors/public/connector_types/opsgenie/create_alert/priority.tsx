/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';

import { EuiFormRow, EuiSelect } from '@elastic/eui';

import type { OpsgenieCreateAlertParams } from '../../../../server/connector_types';
import * as i18n from './translations';
import { EditActionCallback } from '../types';
import { OptionalFieldLabel } from '../../../common/optional_field_label';

interface PriorityComponentProps {
  priority: OpsgenieCreateAlertParams['priority'];
  onChange: EditActionCallback;
}

const PriorityComponent: React.FC<PriorityComponentProps> = ({ priority, onChange }) => {
  const onPriorityChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      onChange('priority', event.target.value);
    },
    [onChange]
  );

  return (
    <EuiFormRow
      fullWidth
      label={i18n.PRIORITY_LABEL}
      data-test-subj="opsgenie-priority-row"
      labelAppend={OptionalFieldLabel}
    >
      <EuiSelect
        fullWidth
        data-test-subj="opsgenie-prioritySelect"
        options={priorityOptions}
        hasNoInitialSelection={true}
        value={priority}
        onChange={onPriorityChange}
      />
    </EuiFormRow>
  );
};

PriorityComponent.displayName = 'Priority';

export const Priority = React.memo(PriorityComponent);

const priorityOptions = [
  {
    value: 'P1',
    text: i18n.PRIORITY_1,
    ['data-test-subj']: 'opsgenie-priority-p1',
  },
  {
    value: 'P2',
    text: i18n.PRIORITY_2,
    ['data-test-subj']: 'opsgenie-priority-p2',
  },
  {
    value: 'P3',
    text: i18n.PRIORITY_3,
    ['data-test-subj']: 'opsgenie-priority-p3',
  },
  {
    value: 'P4',
    text: i18n.PRIORITY_4,
    ['data-test-subj']: 'opsgenie-priority-p4',
  },
  {
    value: 'P5',
    text: i18n.PRIORITY_5,
    ['data-test-subj']: 'opsgenie-priority-p5',
  },
];
