/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import type { ComponentProps } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { CreateField } from '../../../public/application/components/mappings_editor/components/document_fields/fields/create_field/create_field';
import type { NormalizedFields } from '../../../public/application/components/mappings_editor/types';

import { getMockForm, resetForm, setMockForm } from './create_field.helpers';
import type { FormState, MockForm } from './create_field.helpers';
import { getMockFormState } from './create_field.helpers';

const mockDispatch = vi.fn();

vi.mock('../../../public/application/components/mappings_editor/shared_imports', async () => {
  const actual = (await vi.importActual('../../../public/application/components/mappings_editor/shared_imports'));
  const {
    getMockFormState: getMockFormStateFromHelpers,
    resetForm: resetFormState,
    setMockForm: setMockFormRef,
    updateMockFormState,
  } = (await vi.importActual('./create_field.helpers')) as typeof import('./create_field.helpers');
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
      const submit = vi.fn(async () => ({ isValid: true, data: getMockFormStateFromHelpers() }));
      const reset = vi.fn(() => {
        resetFormState();
      });
      const getErrors = vi.fn(() => []);
      const getFormData = vi.fn(() => getMockFormStateFromHelpers());
      const setFieldValue = vi.fn((field: keyof FormState, value: unknown) => {
        updateMockFormState(field, value);
      });
      const getFields = vi.fn(() => ({
        name: { value: getMockFormStateFromHelpers().name },
      }));
      const unsubscribe = vi.fn();
      const subscribe = vi.fn((_listener?: unknown) => ({
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

vi.mock(
  '../../../public/application/components/mappings_editor/components/document_fields/field_parameters',
  async () => {
    const { getMockFormState: getMockFormStateFromHelpers, updateMockFormState } =
      (await vi.importActual('./create_field.helpers')) as typeof import('./create_field.helpers');

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

vi.mock(
  '../../../public/application/components/mappings_editor/components/document_fields/field_parameters/reference_field_selects',
  () => {
      const mocked = {
        ReferenceFieldSelects: () => null,
      };
      return { ...mocked, default: mocked };
    }
);

vi.mock(
  '../../../public/application/components/mappings_editor/components/document_fields/field_parameters/select_inference_id',
  () => {
      const mocked = {
        SelectInferenceId: () => null,
      };
      return { ...mocked, default: mocked };
    }
);

vi.mock('../../../public/application/components/mappings_editor/mappings_state_context', async () => {
      const mocked = {
      ...(await vi.importActual('../../../public/application/components/mappings_editor/mappings_state_context')),
      useMappingsState: () => ({
        fields: { byId: {}, rootLevelFields: [], aliases: {}, maxNestedDepth: 0 },
        mappingViewFields: { byId: {}, rootLevelFields: [], aliases: {}, maxNestedDepth: 0 },
      }),
      useDispatch: () => mockDispatch,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../public/application/app_context', async () => {
      const mocked = {
      ...(await vi.importActual('../../../public/application/app_context')),
      useAppContext: vi.fn(() => ({
        config: { enforceAdaptiveAllocations: false },
        services: {
          notificationService: {
            toasts: {},
          },
        },
      })),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../public/application/services/api', async () => {
      const mocked = {
      ...(await vi.importActual('../../../public/application/services/api')),
      useLoadInferenceEndpoints: vi.fn().mockReturnValue({
        data: [],
        isLoading: false,
        resendRequest: vi.fn(),
      }),
    };
      return { ...mocked, default: mocked };
    });

const emptyAllFields: NormalizedFields['byId'] = {};

const defaultProps: ComponentProps<typeof CreateField> = {
  allFields: emptyAllFields,
  isRootLevelField: true,
  isMultiField: false,
  isCancelable: true,
  isAddingFields: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
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
        const focusSpy = vi.spyOn(fieldTypeInput, 'focus');

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
      const focusSpy = vi.spyOn(fieldTypeInput, 'focus');

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
