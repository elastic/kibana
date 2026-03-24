/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import '../../__jest__/setup_environment';
import type { RuntimeField } from '../../types';
import type { Props, FormState } from './runtime_field_form';
import { RuntimeFieldForm } from './runtime_field_form';

const links: Props['links'] = {
  runtimePainless: 'https://jestTest.elastic.co/to-be-defined.html',
};

const renderComponent = (props: Partial<Props> = {}) =>
  render(
    <I18nProvider>
      <RuntimeFieldForm links={links} {...props} />
    </I18nProvider>
  );

describe('Runtime field form', () => {
  let onChange: jest.Mock<Props['onChange']> = jest.fn();

  const lastOnChangeCall = (): FormState =>
    onChange.mock.calls[onChange.mock.calls.length - 1][0] as FormState;

  beforeEach(() => {
    onChange = jest.fn();
  });

  test('should render expected 3 fields (name, returnType, script)', () => {
    renderComponent();

    expect(screen.getByLabelText('Name field')).toBeInTheDocument();
    expect(screen.getByTestId('typeField')).toBeInTheDocument();
    expect(screen.getByTestId('scriptField')).toBeInTheDocument();
  });

  test('should have a link to learn more about painless syntax', () => {
    renderComponent();

    const link = screen.getByTestId('painlessSyntaxLearnMoreLink');
    expect(link).toHaveAttribute('href', links.runtimePainless);
  });

  test('should accept a "defaultValue" prop', () => {
    const defaultValue: RuntimeField = {
      name: 'foo',
      type: 'date',
      script: { source: 'test=123' },
    };
    renderComponent({ defaultValue });

    expect(screen.getByLabelText('Name field')).toHaveValue(defaultValue.name);
    expect(screen.getByTestId('typeField')).toHaveValue(defaultValue.type);
    expect(screen.getByTestId('scriptField')).toHaveValue(defaultValue.script.source);
  });

  test('should accept an "onChange" prop to forward the form state', async () => {
    const defaultValue: RuntimeField = {
      name: 'foo',
      type: 'date',
      script: { source: 'test=123' },
    };
    renderComponent({ onChange, defaultValue });

    await waitFor(() => expect(onChange).toHaveBeenCalled());

    let lastState = lastOnChangeCall();
    expect(lastState.isValid).toBe(undefined);
    expect(lastState.isSubmitted).toBe(false);
    expect(lastState.submit).toBeDefined();

    let data!: RuntimeField;
    await act(async () => {
      ({ data } = await lastState.submit());
    });
    expect(data).toEqual(defaultValue);

    // Make sure that both isValid and isSubmitted state are now "true"
    await waitFor(() => {
      lastState = lastOnChangeCall();
      expect(lastState.isValid).toBe(true);
      expect(lastState.isSubmitted).toBe(true);
    });
  });
});
