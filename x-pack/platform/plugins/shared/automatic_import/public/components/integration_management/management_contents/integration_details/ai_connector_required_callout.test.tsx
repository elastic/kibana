/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { FormHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { Form, UseField, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { AiConnectorRequiredCallout } from './ai_connector_required_callout';

jest.mock('../../../../common/components/add_ai_connector_button', () => ({
  AddAiConnectorButton: () => (
    <button type="button" data-test-subj="addNewConnectorButton">
      {'Add AI connector'}
    </button>
  ),
}));

let testForm: FormHook;

const TestForm: React.FC = () => {
  const { form } = useForm({
    defaultValue: { connectorId: '' },
    schema: {
      connectorId: {
        validations: [{ validator: fieldValidators.emptyField('Connector required') }],
      },
    },
  });
  testForm = form;

  return (
    <Form form={form}>
      <UseField path="connectorId">{() => null}</UseField>
      <AiConnectorRequiredCallout />
    </Form>
  );
};

const renderCallout = () =>
  render(
    <I18nProvider>
      <TestForm />
    </I18nProvider>
  );

describe('AiConnectorRequiredCallout', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = jest.fn();
  });

  it('is hidden before the connector has been validated', () => {
    const { queryByTestId } = renderCallout();

    expect(queryByTestId('aiConnectorRequiredCallout')).not.toBeInTheDocument();
  });

  it('is shown and scrolled to without taking focus when the connector fails validation', async () => {
    const { getByTestId } = renderCallout();

    await act(async () => {
      await testForm.validateFields(['connectorId']);
    });

    const callout = getByTestId('aiConnectorRequiredCallout');
    expect(callout).toHaveTextContent('Add an AI connector');
    expect(callout).toHaveTextContent(
      'A connector is needed to analyze your log samples and build the ingest pipeline'
    );
    expect(getByTestId('addNewConnectorButton')).toBeInTheDocument();
    expect(callout).not.toHaveFocus();
    expect(callout.scrollIntoView).toHaveBeenCalled();
  });

  it('announces only the text content to screen readers', async () => {
    const { getByRole, getAllByTestId } = renderCallout();

    await act(async () => {
      await testForm.validateFields(['connectorId']);
    });

    await waitFor(() =>
      expect(getByRole('status')).toHaveTextContent(
        'Add an AI connector. A connector is needed to analyze your log samples and build the ingest pipeline'
      )
    );
    expect(getAllByTestId('addNewConnectorButton')).toHaveLength(1);
  });

  it('is hidden once a connector is selected', async () => {
    const { getByTestId, queryByTestId } = renderCallout();

    await act(async () => {
      await testForm.validateFields(['connectorId']);
    });
    expect(getByTestId('aiConnectorRequiredCallout')).toBeInTheDocument();

    await act(async () => {
      testForm.setFieldValue('connectorId', 'connector-1');
    });

    expect(queryByTestId('aiConnectorRequiredCallout')).not.toBeInTheDocument();
  });
});
