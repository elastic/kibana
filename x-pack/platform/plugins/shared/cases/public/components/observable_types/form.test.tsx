/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import { ObservableTypesForm, type ObservableTypesFormProps } from './form';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { FormState } from '../configure_cases/flyout';
import type { ObservableTypeConfiguration } from '../../../common/types/domain/configure/v1';
import { MAX_CUSTOM_OBSERVABLE_TYPES_LABEL_LENGTH } from '../../../common/constants';

describe('ObservableTypesForm ', () => {
  let appMock: AppMockRenderer;

  const props: ObservableTypesFormProps = {
    onChange: jest.fn(),
    initialValue: null,
  };

  beforeEach(() => {
    appMock = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    appMock.render(<ObservableTypesForm {...props} />);
    expect(await screen.findByTestId('observable-types-form')).toBeInTheDocument();
  });

  describe('when initial value is set', () => {
    let formState: FormState<ObservableTypeConfiguration>;
    const onChangeState = (state: FormState<ObservableTypeConfiguration>) => (formState = state);

    it('should pass initial key to onChange handler', async () => {
      appMock.render(
        <ObservableTypesForm
          onChange={onChangeState}
          initialValue={{ key: 'initial-key', label: 'initial label' }}
        />
      );

      await waitFor(() => {
        expect(formState).not.toBeUndefined();
      });

      const labelInput = await screen.findByTestId('observable-type-label-input');

      expect(labelInput).toBeInTheDocument();

      fireEvent.change(labelInput, {
        target: { value: 'changed label' },
      });

      const { data, isValid } = await formState!.submit();

      expect(isValid).toEqual(true);
      expect(data.key).toEqual('initial-key');
      expect(data.label).toEqual('changed label');
    });

    it('should not allow invalid labels', async () => {
      appMock.render(
        <ObservableTypesForm
          onChange={onChangeState}
          initialValue={{ key: 'initial-key', label: 'initial label' }}
        />
      );

      await waitFor(() => {
        expect(formState).not.toBeUndefined();
      });

      const labelInput = await screen.findByTestId('observable-type-label-input');

      expect(labelInput).toBeInTheDocument();

      fireEvent.change(labelInput, {
        target: { value: '' },
      });

      const { isValid } = await formState!.submit();

      expect(isValid).toEqual(false);

      fireEvent.change(labelInput, {
        target: { value: 'a'.repeat(MAX_CUSTOM_OBSERVABLE_TYPES_LABEL_LENGTH + 1) },
      });

      const { isValid: isValidWithTooLongLabel } = await formState!.submit();

      expect(isValidWithTooLongLabel).toEqual(false);
    });
  });

  describe('when initial value is missing', () => {
    it('should pass generated key to onChange handler', async () => {
      let formState: FormState<ObservableTypeConfiguration>;

      const onChangeState = (state: FormState<ObservableTypeConfiguration>) => (formState = state);

      appMock.render(<ObservableTypesForm initialValue={null} onChange={onChangeState} />);

      await waitFor(() => {
        expect(formState).not.toBeUndefined();
      });

      const labelInput = await screen.findByTestId('observable-type-label-input');

      expect(labelInput).toBeInTheDocument();

      fireEvent.change(labelInput, {
        target: { value: 'changed label' },
      });

      const { data, isValid } = await formState!.submit();

      expect(isValid).toEqual(true);
      expect(data.key).toEqual(expect.any(String));
      expect(data.label).toEqual('changed label');
    });
  });
});
