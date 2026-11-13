/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, useMemo, useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { z } from '@kbn/zod/v4';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '../../utils/zod_resolver';
import type { CaseActionConnector } from '../types';
import { NumberField, TextField } from '../rhf_fields';
import { getCaseConnectors } from '.';
import { ConnectorFieldsForm } from './fields_form';
import {
  getConnectorDefaultFields,
  getConnectorFieldName,
  getConnectorFieldsSchema,
  useConnectorFields,
  useResetConnectorFields,
} from './connector_fields_contract';

const { caseConnectorsRegistry: registry } = getCaseConnectors();

const FirstFields = () => {
  const fields = useConnectorFields<{ name?: string }>();

  return (
    <>
      <TextField name={getConnectorFieldName('name')} label="Name" data-test-subj="nameInput" />
      <span data-test-subj="liveName">{fields?.name ?? ''}</span>
    </>
  );
};

const SecondFields = () => (
  <NumberField name={getConnectorFieldName('count')} label="Count" data-test-subj="countInput" />
);

registry.register({
  id: '.test-first',
  fieldsComponent: lazy(() => Promise.resolve({ default: FirstFields })),
  previewComponent: null,
  fieldsSchema: z.object({ name: z.string().min(1, 'Name is required') }),
  defaultFields: { name: '' },
});
registry.register({
  id: '.test-second',
  fieldsComponent: lazy(() => Promise.resolve({ default: SecondFields })),
  previewComponent: null,
  fieldsSchema: z.object({ count: z.number().min(1, 'Count is required') }),
  defaultFields: { count: undefined },
});

const connectors = ['.test-first', '.test-second', '.none'].map((actionTypeId) => ({
  id: actionTypeId,
  actionTypeId,
  name: actionTypeId,
})) as CaseActionConnector[];

const onValid = jest.fn();

const ParentForm = () => {
  const [connector, setConnector] = useState(connectors[0]);
  const resolver = useMemo(
    () => zodResolver(z.object({ fields: getConnectorFieldsSchema(connector, registry) })),
    [connector]
  );
  const form = useForm({
    resolver,
    mode: 'onChange',
    defaultValues: { fields: getConnectorDefaultFields(connectors[0]) },
  });

  return (
    <FormProvider {...form}>
      <ConnectorSwitcher connector={connector} onChange={setConnector} />
      <ConnectorFieldsForm connector={connector} isInSidebarForm={false} />
      <span data-test-subj="isValid">{String(form.formState.isValid)}</span>
      <button type="button" onClick={form.handleSubmit(onValid)}>
        {'Submit'}
      </button>
    </FormProvider>
  );
};

const ConnectorSwitcher = ({
  connector,
  onChange,
}: {
  connector: CaseActionConnector;
  onChange: (connector: CaseActionConnector) => void;
}) => {
  const resetFields = useResetConnectorFields();

  return (
    <select
      aria-label="connector"
      value={connector.id}
      onChange={(event) => {
        const next = connectors.find(({ id }) => id === event.target.value) as CaseActionConnector;
        onChange(next);
        resetFields(next);
      }}
    >
      {connectors.map(({ id }) => (
        <option key={id} value={id}>
          {id}
        </option>
      ))}
    </select>
  );
};

describe('connector fields contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getConnectorFieldsSchema', () => {
    it('returns the registered connector schema', () => {
      expect(getConnectorFieldsSchema(connectors[0]).safeParse({ name: '' }).success).toBe(false);
      expect(getConnectorFieldsSchema(connectors[0]).safeParse({ name: 'a' }).success).toBe(true);
    });

    it('only accepts null for no connector', () => {
      expect(getConnectorFieldsSchema(null, registry).safeParse(null).success).toBe(true);
      expect(getConnectorFieldsSchema(connectors[2], registry).safeParse({ a: 1 }).success).toBe(
        false
      );
    });

    it('does not validate connectors without a schema', () => {
      const jira = { id: 'j', actionTypeId: '.jira', name: 'j' } as CaseActionConnector;

      expect(getConnectorFieldsSchema(jira, registry).safeParse({ anything: 1 }).success).toBe(
        true
      );
    });
  });

  it('uses the registered defaults, and null for no connector', () => {
    expect(getConnectorDefaultFields(connectors[0])).toEqual({ name: '' });
    expect(getConnectorDefaultFields(connectors[2])).toBeNull();
    expect(getConnectorDefaultFields(null)).toBeNull();
  });

  it('drops the previous connector errors and revalidates when switching to no connector', async () => {
    render(<ParentForm />);

    await userEvent.click(await screen.findByText('Submit'));
    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    expect(screen.getByTestId('isValid')).toHaveTextContent('false');

    await userEvent.selectOptions(screen.getByLabelText('connector'), '.none');

    await waitFor(() => expect(screen.queryByText('Name is required')).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByTestId('isValid')).toHaveTextContent('true'));
  });

  it('validates the mounted connector fields through its schema', async () => {
    render(<ParentForm />);

    await userEvent.click(await screen.findByText('Submit'));
    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    expect(onValid).not.toHaveBeenCalled();

    await userEvent.type(screen.getByTestId('nameInput'), 'abc');
    await userEvent.click(screen.getByText('Submit'));

    await waitFor(() =>
      expect(onValid).toHaveBeenCalledWith({ fields: { name: 'abc' } }, expect.anything())
    );
  });

  it('exposes live field values with useConnectorFields', async () => {
    render(<ParentForm />);

    await userEvent.type(await screen.findByTestId('nameInput'), 'abc');

    await waitFor(() => expect(screen.getByTestId('liveName')).toHaveTextContent('abc'));
  });

  it('does not submit values of the previous connector after switching', async () => {
    render(<ParentForm />);

    await userEvent.type(await screen.findByTestId('nameInput'), 'abc');
    await userEvent.selectOptions(screen.getByLabelText('connector'), '.test-second');
    await userEvent.type(await screen.findByTestId('countInput'), '3');
    await userEvent.click(screen.getByText('Submit'));

    await waitFor(() =>
      expect(onValid).toHaveBeenCalledWith({ fields: { count: 3 } }, expect.anything())
    );
  });

  it('submits null fields when switching to no connector', async () => {
    render(<ParentForm />);

    await userEvent.type(await screen.findByTestId('nameInput'), 'abc');
    await userEvent.selectOptions(screen.getByLabelText('connector'), '.none');
    await userEvent.click(screen.getByText('Submit'));

    await waitFor(() => expect(onValid).toHaveBeenCalledWith({ fields: null }, expect.anything()));
  });
});
