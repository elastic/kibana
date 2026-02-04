/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { docLinksServiceMock } from '@kbn/core-doc-links-browser-mocks';

import '../../__jest__/setup_environment';
import type { RuntimeField } from '../../types';
import type { FormState } from '../runtime_field_form/runtime_field_form';
import type { Props } from './runtime_field_editor';
import { RuntimeFieldEditor } from './runtime_field_editor';

const docLinks = docLinksServiceMock.createStartContract();

describe('Runtime field editor', () => {
  let onChange: jest.Mock<Props['onChange']> = jest.fn();

  const lastOnChangeCall = (): FormState =>
    onChange.mock.calls[onChange.mock.calls.length - 1][0] as FormState;

  const renderComponent = (props: Partial<Props> = {}) =>
    render(
      <I18nProvider>
        <RuntimeFieldEditor docLinks={docLinks} {...props} />
      </I18nProvider>
    );

  beforeEach(() => {
    onChange = jest.fn();
  });

  test('should render the form fields and a link derived from docLinks', () => {
    renderComponent();

    expect(screen.getByLabelText('Name field')).toBeInTheDocument();
    expect(screen.getByTestId('typeField')).toBeInTheDocument();
    expect(screen.getByTestId('scriptField')).toBeInTheDocument();
    expect(screen.getByTestId('painlessSyntaxLearnMoreLink')).toHaveAttribute(
      'href',
      docLinks.links.runtimeFields.mapping
    );
  });

  test('should accept a defaultValue and onChange prop to forward the form state', async () => {
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

    await waitFor(() => {
      lastState = lastOnChangeCall();
      expect(lastState.isValid).toBe(true);
      expect(lastState.isSubmitted).toBe(true);
    });
  });

  test('should accept a list of existing concrete fields and display a callout when shadowing one of the fields', async () => {
    const existingConcreteFields = [{ name: 'myConcreteField', type: 'keyword' }];

    renderComponent({ onChange, ctx: { existingConcreteFields } });

    expect(screen.queryByTestId('shadowingFieldCallout')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Name field'), {
      target: { value: existingConcreteFields[0].name },
    });

    await screen.findByTestId('shadowingFieldCallout');
  });

  describe('validation', () => {
    test('should accept an optional list of existing runtime fields and prevent creating duplicates', async () => {
      const existingRuntimeFieldNames = ['myRuntimeField'];

      renderComponent({ onChange, ctx: { namesNotAllowed: existingRuntimeFieldNames } });

      await waitFor(() => expect(onChange).toHaveBeenCalled());

      fireEvent.change(screen.getByLabelText('Name field'), {
        target: { value: existingRuntimeFieldNames[0] },
      });
      fireEvent.change(screen.getByTestId('scriptField'), {
        target: { value: 'echo("hello")' },
      });

      let isValid!: boolean;
      await act(async () => {
        ({ isValid } = await lastOnChangeCall().submit());
      });
      expect(isValid).toBe(false);

      await screen.findByText('There is already a field with this name.');
    });

    test('should not count the default value as a duplicate', async () => {
      const existingRuntimeFieldNames = ['myRuntimeField'];

      const defaultValue: RuntimeField = {
        name: 'myRuntimeField',
        type: 'boolean',
        script: { source: 'emit("hello")' },
      };

      renderComponent({
        defaultValue,
        onChange,
        ctx: { namesNotAllowed: existingRuntimeFieldNames },
      });

      await waitFor(() => expect(onChange).toHaveBeenCalled());

      let isValid!: boolean;
      await act(async () => {
        ({ isValid } = await lastOnChangeCall().submit());
      });
      expect(isValid).toBe(true);

      await waitFor(() =>
        expect(screen.queryByText('There is already a field with this name.')).toBeNull()
      );
    });
  });
});
