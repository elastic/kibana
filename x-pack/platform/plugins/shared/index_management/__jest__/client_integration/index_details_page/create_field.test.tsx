/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ComponentProps } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { CreateField } from '../../../public/application/components/mappings_editor/components/document_fields/fields/create_field/create_field';
import type { NormalizedFields } from '../../../public/application/components/mappings_editor/types';

import { getMockForm, resetForm, setMockForm } from './create_field.helpers';
import type { FormState, MockForm } from './create_field.helpers';
import { getMockFormState } from './create_field.helpers';

const mockDispatch = jest.fn();

jest.mock('../../../public/application/components/mappings_editor/shared_imports', () => {
  const actual = jest.requireActual(
    '../../../public/application/components/mappings_editor/shared_imports'
  );
  const {
    getMockFormState: getMockFormStateFromHelpers,
    resetForm: resetFormState,
    setMockForm: setMockFormRef,
    updateMockFormState,
  } = jest.requireActual('./create_field.helpers') as typeof import('./create_field.helpers');
  const DefaultFormWrapper = ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => <form {...props}>{children}</form>;
  return {
    ...actual,
    Form: ({
      children,
      onSubmit,
      FormWrapper: FormWrapperComponent,
      form: _form,
      ...rest
    }: {
      children: React.ReactNode;
      onSubmit: React.FormEventHandler;
      FormWrapper?: React.ComponentType<React.PropsWithChildren<Record<string, unknown>>>;
      form?: unknown;
      [key: string]: unknown;
    }) => {
      const Wrapper = FormWrapperComponent ?? DefaultFormWrapper;
      const { 'data-test-subj': dataTestSubj, ...wrapperProps } = rest;
      return (
        <Wrapper onSubmit={onSubmit} data-test-subj={dataTestSubj} {...wrapperProps}>
          {children}
        </Wrapper>
      );
    },
    useForm: () => {
      const submit = jest.fn(async () => ({ isValid: true, data: getMockFormStateFromHelpers() }));
      const reset = jest.fn(() => {
        resetFormState();
      });
      const getErrors = jest.fn(() => []);
      const getFormData = jest.fn(() => getMockFormStateFromHelpers());
      const setFieldValue = jest.fn((field: keyof FormState, value: unknown) => {
        updateMockFormState(field, value);
      });
      const getFields = jest.fn(() => ({
        name: { value: getMockFormStateFromHelpers().name },
      }));
      const unsubscribe = jest.fn();
      const subscribe = jest.fn((_listener?: unknown) => ({
        unsubscribe,
      }));

      const mockForm: MockForm = {
        submit,
        reset,
        getErrors,
        getFormData,
        setFieldValue,
        getFields,
        subscribe,
      };
      setMockFormRef(mockForm);
      return { form: mockForm };
    },
    useFormData: () => [
      { type: getMockFormStateFromHelpers().type, subType: getMockFormStateFromHelpers().subType },
    ],
  };
});

jest.mock(
  '../../../public/application/components/mappings_editor/components/document_fields/field_parameters',
  () => {
    const { getMockFormState: getMockFormStateFromHelpers, updateMockFormState } =
      jest.requireActual('./create_field.helpers') as typeof import('./create_field.helpers');

    return {
      TypeParameter: ({
        fieldTypeInputRef,
        ...rest
      }: {
        fieldTypeInputRef: React.RefObject<HTMLInputElement>;
      }) => {
        const {
          isRootLevelField,
          isMultiField,
          showDocLink,
          isSemanticTextEnabled,
          ...inputProps
        } = rest as Record<string, unknown>;
        return (
          <input {...inputProps} data-test-subj="fieldTypeInput" ref={fieldTypeInputRef} readOnly />
        );
      },
      NameParameter: ({ isSemanticText, ...rest }: { isSemanticText?: boolean }) => (
        <input
          {...rest}
          data-test-subj="nameParameterInput"
          value={getMockFormStateFromHelpers().name}
          onChange={(event) => {
            updateMockFormState('name', event.target.value);
          }}
        />
      ),
      SubTypeParameter: () => null,
    };
  }
);

jest.mock(
  '../../../public/application/components/mappings_editor/components/document_fields/field_parameters/reference_field_selects',
  () => ({
    ReferenceFieldSelects: () => null,
  })
);

jest.mock(
  '../../../public/application/components/mappings_editor/components/document_fields/field_parameters/select_inference_id',
  () => ({
    SelectInferenceId: () => null,
  })
);

jest.mock('../../../public/application/components/mappings_editor/mappings_state_context', () => ({
  ...jest.requireActual(
    '../../../public/application/components/mappings_editor/mappings_state_context'
  ),
  useMappingsState: () => ({
    fields: { byId: {}, rootLevelFields: [], aliases: {}, maxNestedDepth: 0 },
    mappingViewFields: { byId: {}, rootLevelFields: [], aliases: {}, maxNestedDepth: 0 },
  }),
  useDispatch: () => mockDispatch,
}));

jest.mock('../../../public/application/app_context', () => ({
  ...jest.requireActual('../../../public/application/app_context'),
  useAppContext: jest.fn(() => ({
    config: { enforceAdaptiveAllocations: false },
    services: {
      notificationService: {
        toasts: {},
      },
    },
  })),
}));

jest.mock('../../../public/application/services/api', () => ({
  ...jest.requireActual('../../../public/application/services/api'),
  useLoadInferenceEndpoints: jest.fn().mockReturnValue({
    data: [],
    isLoading: false,
    resendRequest: jest.fn(),
  }),
}));

const emptyAllFields: NormalizedFields['byId'] = {};

const defaultProps: ComponentProps<typeof CreateField> = {
  allFields: emptyAllFields,
  isRootLevelField: true,
  isMultiField: false,
  isCancelable: true,
  isAddingFields: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
  setMockForm(null);
  resetForm();
});

describe('<CreateField />', () => {
  describe('WHEN clicking outside the form', () => {
    describe('AND the name is empty', () => {
      it('SHOULD cancel the flow', async () => {
        render(<CreateField {...defaultProps} />);
        screen.getByTestId('createFieldForm');

        fireEvent.mouseDown(document.body);
        fireEvent.mouseUp(document.body);
        fireEvent.click(document.body);

        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'documentField.changeStatus',
          value: 'idle',
        });

        expect(getMockForm()!.submit).not.toHaveBeenCalled();
      });
    });

    describe('AND the name has a value', () => {
      it('SHOULD not refocus the field type input or dispatch', async () => {
        render(<CreateField {...defaultProps} />);
        screen.getByTestId('createFieldForm');

        const nameInput = screen.getByTestId('nameParameterInput');
        fireEvent.change(nameInput, { target: { value: 'semantic_field' } });

        const fieldTypeInput = screen.getByTestId('fieldTypeInput') as HTMLInputElement;
        const focusSpy = jest.spyOn(fieldTypeInput, 'focus');

        fireEvent.mouseDown(document.body);
        fireEvent.mouseUp(document.body);
        fireEvent.click(document.body);

        expect(getMockForm()!.submit).toHaveBeenCalledTimes(1);

        expect(mockDispatch).not.toHaveBeenCalled();
        expect(focusSpy).not.toHaveBeenCalled();
      });
    });
  });

  describe('WHEN submitting the form', () => {
    it('SHOULD dispatch the new field, reset the form, and refocus the field type input', async () => {
      render(<CreateField {...defaultProps} />);
      screen.getByTestId('createFieldForm');

      const nameInput = screen.getByTestId('nameParameterInput');
      fireEvent.change(nameInput, { target: { value: 'semantic_field' } });

      getMockForm()!.setFieldValue('type', 'keyword');

      const fieldTypeInput = screen.getByTestId('fieldTypeInput') as HTMLInputElement;
      const focusSpy = jest.spyOn(fieldTypeInput, 'focus');

      const addButton = screen.getByTestId('addButton');
      fireEvent.click(addButton);

      expect(getMockForm()!.submit).toHaveBeenCalledTimes(1);

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'field.add',
          value: expect.objectContaining({ name: 'semantic_field', type: 'keyword' }),
        });

        expect(getMockForm()!.reset).toHaveBeenCalledTimes(1);
        expect(getMockFormState().name).toBe('');
        expect(focusSpy).toHaveBeenCalled();
      });
    });
  });
});
