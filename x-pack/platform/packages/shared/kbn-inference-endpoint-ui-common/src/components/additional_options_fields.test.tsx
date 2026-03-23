/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AdditionalOptionsFields } from './additional_options_fields';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { Form, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { Config } from '../types/types';
import { CHAT_COMPLETION_TASK_TYPE } from '../constants';

const MockFormProvider = ({ children }: { children: React.ReactElement }) => {
  const { form } = useForm();

  return (
    <I18nProvider>
      <Form form={form}>{children}</Form>
    </I18nProvider>
  );
};

const textEmbeddingTask = 'text_embedding';

const mockConfig = {
  provider: 'openai',
  contextWindowLength: '',
  inferenceId: 'testId',
  providerConfig: {},
  taskType: CHAT_COMPLETION_TASK_TYPE,
} as unknown as Config;
const taskTypeOptions = [
  { id: textEmbeddingTask, label: textEmbeddingTask, value: textEmbeddingTask },
  {
    id: CHAT_COMPLETION_TASK_TYPE,
    label: CHAT_COMPLETION_TASK_TYPE,
    value: CHAT_COMPLETION_TASK_TYPE,
  },
];

describe('AdditionalOptionsFields', () => {
  describe('contextWindowLength', () => {
    it('should render contextWindowLength field when task type options include chat_completion', () => {
      render(
        <MockFormProvider>
          <AdditionalOptionsFields
            config={mockConfig}
            taskTypeOptions={taskTypeOptions}
            onTaskTypeOptionsSelect={jest.fn()}
            allowContextWindowLength={true}
            selectedTaskType={CHAT_COMPLETION_TASK_TYPE}
          />
        </MockFormProvider>
      );

      const inputField = screen.getByTestId('configuration-formrow-contextWindowLength');
      const inputLabel = screen.getByTestId('context-window-length-details-label');
      const isInputInvalid = inputField.getAttribute('aria-invalid');
      expect(inputField).toBeInTheDocument();
      expect(inputLabel).toBeInTheDocument();
      expect(isInputInvalid).toBeNull();
    });

    it('should render contextWindowLength field as valid when selectedTaskType is chat_completion', () => {
      render(
        <MockFormProvider>
          <AdditionalOptionsFields
            config={{
              ...mockConfig,
              taskType: CHAT_COMPLETION_TASK_TYPE,
              contextWindowLength: 500,
            }}
            taskTypeOptions={taskTypeOptions}
            onTaskTypeOptionsSelect={jest.fn()}
            allowContextWindowLength={true}
            selectedTaskType={CHAT_COMPLETION_TASK_TYPE}
          />
        </MockFormProvider>
      );

      const inputLabel = screen.getByTestId('context-window-length-details-label');
      const inputField = screen.getByTestId('configuration-formrow-contextWindowLength');
      const isInputInvalid = inputField.getAttribute('aria-invalid');
      const inputNumberField = screen.getByTestId('contextWindowLengthNumber');
      const inputValue = inputNumberField.getAttribute('value');
      expect(inputLabel).toBeInTheDocument();
      expect(isInputInvalid).toBeNull();
      expect(inputNumberField).toBeInTheDocument();
      expect(inputValue).toBe('500');
    });

    it('should render contextWindowLength field with invalid indicator when selectedTaskType is not chat_completion', () => {
      render(
        <MockFormProvider>
          <AdditionalOptionsFields
            config={{ ...mockConfig, taskType: textEmbeddingTask, contextWindowLength: 500 }}
            taskTypeOptions={taskTypeOptions}
            onTaskTypeOptionsSelect={jest.fn()}
            allowContextWindowLength={true}
            selectedTaskType={textEmbeddingTask}
          />
        </MockFormProvider>
      );

      const inputField = screen.getByTestId('contextWindowLengthNumber');
      const isInvalid = inputField.getAttribute('aria-invalid');
      expect(isInvalid).toBe('true');
    });

    it('should hide contextWindowLength field when chat_completion is not a task option', () => {
      render(
        <MockFormProvider>
          <AdditionalOptionsFields
            config={mockConfig}
            taskTypeOptions={[]}
            onTaskTypeOptionsSelect={jest.fn()}
            allowContextWindowLength={true}
            selectedTaskType={textEmbeddingTask}
          />
        </MockFormProvider>
      );

      const inputField = screen.queryByTestId('configuration-formrow-contextWindowLength');
      const inputLabel = screen.queryByTestId('context-window-length-details-label');
      expect(inputField).not.toBeInTheDocument();
      expect(inputLabel).not.toBeInTheDocument();
    });

    it('should hide contextWindowLength field when allowContextWindowLength is false', () => {
      render(
        <MockFormProvider>
          <AdditionalOptionsFields
            config={mockConfig}
            taskTypeOptions={taskTypeOptions}
            onTaskTypeOptionsSelect={jest.fn()}
            allowContextWindowLength={false}
            selectedTaskType={textEmbeddingTask}
          />
        </MockFormProvider>
      );

      const inputField = screen.queryByTestId('configuration-formrow-contextWindowLength');
      const inputLabel = screen.queryByTestId('context-window-length-details-label');
      expect(inputField).not.toBeInTheDocument();
      expect(inputLabel).not.toBeInTheDocument();
    });
  });

  describe('taskTypeOptions', () => {
    it('should render taskTypeOptions section', () => {
      render(
        <MockFormProvider>
          <AdditionalOptionsFields
            config={mockConfig}
            taskTypeOptions={taskTypeOptions}
            onTaskTypeOptionsSelect={jest.fn()}
            allowContextWindowLength={false}
          />
        </MockFormProvider>
      );

      const taskTypeTitle = screen.getByTestId('task-type-details-label');
      const taskTypeButtons = screen.getByTestId('taskTypeSelect');
      expect(taskTypeTitle).toBeInTheDocument();
      expect(taskTypeButtons).toBeInTheDocument();

      taskTypeOptions.forEach(({ id }) => {
        const optionButton = screen.getByTestId(id);
        expect(optionButton).toBeInTheDocument();
      });
    });

    it('should have single task type selection when only one task type option', () => {
      render(
        <MockFormProvider>
          <AdditionalOptionsFields
            config={mockConfig}
            taskTypeOptions={[taskTypeOptions[0]]}
            onTaskTypeOptionsSelect={jest.fn()}
            allowContextWindowLength={false}
          />
        </MockFormProvider>
      );
      const taskTypeButton = screen.getByTestId('taskTypeSelectSingle');
      expect(taskTypeButton).toBeInTheDocument();
    });

    it('should disable task type selection on edit', () => {
      render(
        <MockFormProvider>
          <AdditionalOptionsFields
            config={mockConfig}
            taskTypeOptions={taskTypeOptions}
            onTaskTypeOptionsSelect={jest.fn()}
            allowContextWindowLength={false}
            isEdit={true}
          />
        </MockFormProvider>
      );
      const taskTypeButtonDisabled = screen.getByTestId('taskTypeSelectDisabled');
      expect(taskTypeButtonDisabled).toBeInTheDocument();
    });
  });

  describe('inferenceId', () => {
    it('should render the inferenceId section', () => {
      render(
        <MockFormProvider>
          <AdditionalOptionsFields
            config={mockConfig}
            taskTypeOptions={taskTypeOptions}
            onTaskTypeOptionsSelect={jest.fn()}
            allowContextWindowLength={false}
          />
        </MockFormProvider>
      );

      const inputField = screen.getByTestId('inference-endpoint-input-field');
      expect(inputField).toBeInTheDocument();
    });
  });
});
