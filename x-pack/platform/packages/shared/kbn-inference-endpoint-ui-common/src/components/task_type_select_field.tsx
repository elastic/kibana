/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { InferenceTaskType } from '@elastic/elasticsearch/lib/api/types';
import { EuiFormRow, EuiSpacer, EuiSuperSelect, EuiText } from '@elastic/eui';
import {
  getFieldValidityAndErrorMessage,
  UseField,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { FormattedMessage } from '@kbn/i18n-react';

import * as LABELS from '../translations';
import type { TaskTypeOption } from '../utils/helpers';

const taskTypeConfig = {
  validations: [
    {
      validator: fieldValidators.emptyField(LABELS.getRequiredMessage('Task type')),
      isBlocking: true,
    },
  ],
};

interface TaskTypeSelectFieldProps {
  taskType: string;
  taskTypeOptions: TaskTypeOption[];
  onTaskTypeOptionsSelect: (taskType: string) => void;
  isEdit?: boolean;
}

export const TaskTypeSelectField: React.FC<TaskTypeSelectFieldProps> = ({
  taskType,
  taskTypeOptions,
  onTaskTypeOptionsSelect,
  isEdit,
}) => {
  const isVisible = !!(taskType || taskTypeOptions.length);

  return (
    <UseField path="config.taskType" config={taskTypeConfig}>
      {(field) => {
        if (!isVisible) return null;

        const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
        return (
          <>
            <EuiSpacer size="m" />
            <EuiFormRow
              id="taskType"
              fullWidth
              isInvalid={isInvalid}
              error={errorMessage}
              label={
                <FormattedMessage
                  id="xpack.inferenceEndpointUICommon.components.taskTypeLabel"
                  defaultMessage="Model task type"
                />
              }
            >
              <EuiSuperSelect
                data-test-subj="taskTypeSelect"
                fullWidth
                disabled={isEdit || taskTypeOptions.length <= 1}
                valueOfSelected={taskType}
                onChange={(value) => onTaskTypeOptionsSelect(value)}
                options={taskTypeOptions.map((option) => ({
                  value: option.id,
                  inputDisplay: option.label,
                  dropdownDisplay: (
                    <>
                      <strong>{option.label}</strong>
                      {LABELS.TASK_TYPE_DESCRIPTIONS[option.id as InferenceTaskType] && (
                        <EuiText size="xs" color="subdued">
                          {LABELS.TASK_TYPE_DESCRIPTIONS[option.id as InferenceTaskType]}
                        </EuiText>
                      )}
                    </>
                  ),
                }))}
              />
            </EuiFormRow>
          </>
        );
      }}
    </UseField>
  );
};
