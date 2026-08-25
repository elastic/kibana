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

const chatCompletionTaskTypeOptions = [
  {
    id: CHAT_COMPLETION_TASK_TYPE,
    value: CHAT_COMPLETION_TASK_TYPE,
    label: CHAT_COMPLETION_TASK_TYPE,
  },
];

const textEmbeddingTaskTypeOptions = [
  { id: textEmbeddingTask, value: textEmbeddingTask, label: textEmbeddingTask },
];

describe('AdditionalOptionsFields', () => {
  describe('contextWindowLength', () => {
    it('should render contextWindowLength field when selectedTaskType is chat_completion', () => {
      render(
        <MockFormProvider>
          <AdditionalOptionsFields
            config={mockConfig}
            allowContextWindowLength={true}
            selectedTaskType={CHAT_COMPLETION_TASK_TYPE}
            taskTypeOptions={chatCompletionTaskTypeOptions}
          />
        </MockFormProvider>
      );

      const inputField = screen.getByTestId('configuration-formrow-contextWindowLength');
      expect(inputField).toBeInTheDocument();
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
            allowContextWindowLength={true}
            selectedTaskType={CHAT_COMPLETION_TASK_TYPE}
            taskTypeOptions={chatCompletionTaskTypeOptions}
          />
        </MockFormProvider>
      );

      const inputField = screen.getByTestId('configuration-formrow-contextWindowLength');
      const inputNumberField = screen.getByTestId('contextWindowLengthNumber');
      const inputValue = inputNumberField.getAttribute('value');
      expect(inputField).toBeInTheDocument();
      expect(inputNumberField).toBeInTheDocument();
      expect(inputValue).toBe('500');
    });

    it('should hide contextWindowLength field when selectedTaskType is not chat_completion', () => {
      render(
        <MockFormProvider>
          <AdditionalOptionsFields
            config={mockConfig}
            allowContextWindowLength={true}
            selectedTaskType={textEmbeddingTask}
            taskTypeOptions={textEmbeddingTaskTypeOptions}
          />
        </MockFormProvider>
      );

      const inputField = screen.queryByTestId('configuration-formrow-contextWindowLength');
      expect(inputField).not.toBeInTheDocument();
    });

    it('should hide contextWindowLength field when allowContextWindowLength is false', () => {
      render(
        <MockFormProvider>
          <AdditionalOptionsFields
            config={mockConfig}
            allowContextWindowLength={false}
            selectedTaskType={CHAT_COMPLETION_TASK_TYPE}
            taskTypeOptions={chatCompletionTaskTypeOptions}
          />
        </MockFormProvider>
      );

      const inputField = screen.queryByTestId('configuration-formrow-contextWindowLength');
      expect(inputField).not.toBeInTheDocument();
    });

    it('should return null when no fields are visible', () => {
      const { container } = render(
        <MockFormProvider>
          <AdditionalOptionsFields
            config={mockConfig}
            allowContextWindowLength={false}
            allowTemperature={false}
            selectedTaskType={textEmbeddingTask}
            taskTypeOptions={textEmbeddingTaskTypeOptions}
          />
        </MockFormProvider>
      );

      expect(container.querySelector('hr')).not.toBeInTheDocument();
    });
  });
});
