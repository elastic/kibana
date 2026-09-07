/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const createInitialFormState = () => ({
  name: '',
  type: undefined as string | undefined,
  subType: undefined as string | undefined,
});

export type FormState = ReturnType<typeof createInitialFormState>;

export interface MockForm {
  submit: jest.Mock<Promise<{ isValid: boolean; data: FormState }>, []>;
  reset: jest.Mock<void, []>;
  getErrors: jest.Mock<unknown[], []>;
  getFormData: jest.Mock<FormState, []>;
  setFieldValue: jest.Mock<void, [keyof FormState, unknown]>;
  getFields: jest.Mock<{ name: { value: string } }, []>;
  subscribe: jest.Mock<{ unsubscribe: () => void }, [unknown?]>;
}

let mockFormState: FormState = createInitialFormState();
let mockForm: MockForm | null = null;

export const resetForm = () => {
  mockFormState = createInitialFormState();
};

export const updateMockFormState = (field: keyof FormState, value: unknown) => {
  mockFormState = { ...mockFormState, [field]: value as never };
};

export const setMockForm = (form: MockForm | null) => {
  mockForm = form;
};

export const getMockForm = () => mockForm;

export const getMockFormState = () => mockFormState;
