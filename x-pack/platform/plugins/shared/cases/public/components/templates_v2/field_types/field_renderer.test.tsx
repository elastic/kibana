/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { load as parseYaml } from 'js-yaml';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { useForm, FormProvider } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { ParsedTemplateDefinitionSchema } from '../../../../common/types/domain/template/latest';
import { CASE_EXTENDED_FIELDS } from '../../../../common/constants';
import { FieldsRenderer } from './field_renderer';

/**
 * Template with a required field whose show_when condition is false by default
 * (controller starts empty, not equal to 'yes').
 */
const templateWithHiddenRequired = `
name: Test
fields:
  - name: controller
    control: INPUT_TEXT
    type: keyword
    label: Controller
  - name: hidden_required
    control: INPUT_TEXT
    type: keyword
    label: Hidden Required
    validation:
      required: true
    display:
      show_when:
        field: controller
        operator: eq
        value: 'yes'
`;

const FormWrapper: React.FC<{
  templateDef: string;
  onSubmitResult: (isValid: boolean) => void;
}> = ({ templateDef, onSubmitResult }) => {
  const parseResult = ParsedTemplateDefinitionSchema.safeParse(parseYaml(templateDef));

  const { form } = useForm<{}>({
    defaultValue: { [CASE_EXTENDED_FIELDS]: {} },
    options: { stripEmptyFields: false },
  });

  if (!parseResult.success) {
    return <>{`Invalid template: ${parseResult.error}`}</>;
  }

  const handleSubmit = async () => {
    const { isValid } = await form.submit();
    onSubmitResult(isValid);
  };

  return (
    <FormProvider form={form}>
      <FieldsRenderer parsedTemplate={parseResult.data} form={form} />
      <button type="button" onClick={handleSubmit}>
        {'Submit'}
      </button>
    </FormProvider>
  );
};

describe('FieldsRenderer — hidden required fields', () => {
  it('does not block form submission when a required field is hidden by show_when', async () => {
    const onSubmitResult = jest.fn();

    render(
      <FormWrapper templateDef={templateWithHiddenRequired} onSubmitResult={onSubmitResult} />
    );

    // The hidden_required field is not rendered because controller !== 'yes'
    expect(screen.queryByText('Hidden Required')).not.toBeInTheDocument();

    // Submit the form — the hidden required field must not block submission
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => {
      expect(onSubmitResult).toHaveBeenCalledWith(true);
    });
  });

  it('blocks form submission when a required field is visible', async () => {
    const onSubmitResult = jest.fn();

    render(
      <FormWrapper templateDef={templateWithHiddenRequired} onSubmitResult={onSubmitResult} />
    );

    // Type 'yes' into the controller input to satisfy the show_when condition
    const [controllerInput] = screen.getAllByTestId('input');
    await userEvent.type(controllerInput, 'yes');

    // The hidden_required field should now be visible
    await waitFor(() => {
      expect(screen.getByText('Hidden Required')).toBeInTheDocument();
    });

    // Submit without filling in the required field — should be blocked
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => {
      expect(onSubmitResult).toHaveBeenCalledWith(false);
    });
  });
});
