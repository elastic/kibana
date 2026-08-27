/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBox } from '@elastic/eui';
import type { EuiComboBoxOptionOption, EuiComboBoxProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';

export interface WorkflowComboBoxOption {
  id: string;
  name: string;
  enabled?: boolean;
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

const toOption = (workflow: WorkflowComboBoxOption): EuiComboBoxOptionOption<string> => ({
  key: workflow.id,
  label:
    workflow.enabled === false
      ? i18n.translate('xpack.agentBuilder.workflowComboBox.disabledOptionLabel', {
          defaultMessage: '{name} (disabled)',
          values: { name: workflow.name },
        })
      : workflow.name,
  value: workflow.id,
});

export const WorkflowComboBox: React.FC<WorkflowComboBoxProps> = ({
  workflows,
  value,
  onChange,
  singleSelection = false,
  'data-test-subj': dataTestSubj = 'workflowComboBox',
  ...comboBoxProps
}) => {
  const options: Array<EuiComboBoxOptionOption<string>> = useMemo(
    () =>
      workflows
        .filter((workflow) => workflow.enabled !== false || value.includes(workflow.id))
        .map(toOption),
    [workflows, value]
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
