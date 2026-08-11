/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBox } from '@elastic/eui';
import type { EuiComboBoxOptionOption, EuiComboBoxProps } from '@elastic/eui';
import React, { useMemo } from 'react';

export interface WorkflowComboBoxOption {
  id: string;
  name: string;
}

export interface WorkflowComboBoxProps
  extends Omit<
    EuiComboBoxProps<string>,
    'options' | 'selectedOptions' | 'onChange' | 'singleSelection'
  > {
  workflows: WorkflowComboBoxOption[];
  value: string[];
  onChange: (workflowIds: string[]) => void;
  singleSelection?: boolean;
}

export const WorkflowComboBox: React.FC<WorkflowComboBoxProps> = ({
  workflows,
  value,
  onChange,
  singleSelection = false,
  'data-test-subj': dataTestSubj = 'workflowComboBox',
  ...comboBoxProps
}) => {
  const toOption = (workflow: WorkflowComboBoxOption): EuiComboBoxOptionOption<string> => ({
    key: workflow.id,
    label: workflow.name,
    value: workflow.id,
  });

  const options: Array<EuiComboBoxOptionOption<string>> = useMemo(
    () => workflows.map(toOption),
    [workflows]
  );

  const workflowsById = useMemo(
    () => new Map(workflows.map((workflow) => [workflow.id, workflow])),
    [workflows]
  );

  const selectedOptions: Array<EuiComboBoxOptionOption<string>> = useMemo(
    () =>
      value.flatMap((workflowId) => {
        const workflow = workflowsById.get(workflowId);
        return workflow ? [toOption(workflow)] : [];
      }),
    [value, workflowsById]
  );

  return (
    <EuiComboBox
      {...comboBoxProps}
      options={options}
      fullWidth
      selectedOptions={selectedOptions}
      onChange={(newSelectedOptions) =>
        onChange(newSelectedOptions.flatMap((option) => (option.value ? [option.value] : [])))
      }
      singleSelection={singleSelection ? { asPlainText: false } : undefined}
      data-test-subj={dataTestSubj}
    />
  );
};
