/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createFormField, createFormFieldsMap } from './form_field';

describe('createFormField', () => {
  it('should create a form field with default values', () => {
    expect(createFormField('firstName')).toStrictEqual({
      configFieldName: undefined,
      defaultValue: '',
      dependsOn: [],
      errors: [],
      formFieldName: 'firstName',
      isNullable: false,
      isOptional: true,
      validator: 'stringValidator',
      value: '',
      valueParser: 'defaultParser',
    });
  });

  it('should create a form field and apply config values', () => {
    expect(createFormField('firstName', 'first_name', { first_name: 'John' })).toStrictEqual({
      configFieldName: 'first_name',
      defaultValue: '',
      dependsOn: [],
      errors: [],
      formFieldName: 'firstName',
      isNullable: false,
      isOptional: true,
      validator: 'stringValidator',
      value: 'John',
      valueParser: 'defaultParser',
    });
  });

  it('should create a form field with overloads', () => {
    expect(
      createFormField(
        'firstName',
        'first_name',
        { first_name: 'John' },
        { isNullable: true, isOptional: false }
      )
    ).toStrictEqual({
      configFieldName: 'first_name',
      defaultValue: '',
      dependsOn: [],
      errors: [],
      formFieldName: 'firstName',
      isNullable: true,
      isOptional: false,
      validator: 'stringValidator',
      value: 'John',
      valueParser: 'defaultParser',
    });
  });
});

describe('createFormFieldsMap', () => {
  it('should create a map of form fields', () => {
    expect(
      createFormFieldsMap([createFormField('firstName'), createFormField('lastName')])
    ).toStrictEqual({
      firstName: {
        configFieldName: undefined,
        defaultValue: '',
        dependsOn: [],
        errors: [],
        formFieldName: 'firstName',
        isNullable: false,
        isOptional: true,
        validator: 'stringValidator',
        value: '',
        valueParser: 'defaultParser',
      },
      lastName: {
        configFieldName: undefined,
        defaultValue: '',
        dependsOn: [],
        errors: [],
        formFieldName: 'lastName',
        isNullable: false,
        isOptional: true,
        validator: 'stringValidator',
        value: '',
        valueParser: 'defaultParser',
      },
    });
  });
});
