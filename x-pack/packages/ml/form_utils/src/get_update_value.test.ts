/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getUpdateValue } from './get_update_value';
import { createFormField, createFormFieldsMap } from './form_field';

interface Config {
  first_name: string;
  last_name: string;
  email?: string;
}

describe('getUpdateValue', () => {
  it('should get the updated value', () => {
    const defaultConfig: Config = { first_name: 'John', last_name: 'Doe' };
    const firstName = createFormField('firstName', 'first_name', defaultConfig);
    const lastName = createFormField('lastName', 'last_name', defaultConfig);
    const email = createFormField('email', 'email', defaultConfig, { isOptional: true });
    const formFieldsMap = createFormFieldsMap([firstName, lastName, email]);

    // Nothing changed yet, so we should get empty objects
    expect(getUpdateValue('firstName', defaultConfig, formFieldsMap, {})).toStrictEqual({});
    expect(getUpdateValue('lastName', defaultConfig, formFieldsMap, {})).toStrictEqual({});
    expect(getUpdateValue('email', defaultConfig, formFieldsMap, {})).toStrictEqual({});

    // Enforcing the form value should return the default config values
    expect(getUpdateValue('firstName', defaultConfig, formFieldsMap, {}, true)).toStrictEqual({
      first_name: 'John',
    });
    expect(getUpdateValue('lastName', defaultConfig, formFieldsMap, {}, true)).toStrictEqual({
      last_name: 'Doe',
    });
    // Because email was not set yet and is optional the returned object returns empty
    expect(getUpdateValue('email', defaultConfig, formFieldsMap, {}, true)).toStrictEqual({});

    formFieldsMap.firstName.value = 'Jane';

    // Just the updated first name should be returned
    expect(getUpdateValue('firstName', defaultConfig, formFieldsMap, {})).toStrictEqual({
      first_name: 'Jane',
    });
    expect(getUpdateValue('lastName', defaultConfig, formFieldsMap, {})).toStrictEqual({});
    expect(getUpdateValue('email', defaultConfig, formFieldsMap, {})).toStrictEqual({});

    // Enforcing the form value should return the updated first name, default last name, and empty email
    expect(getUpdateValue('firstName', defaultConfig, formFieldsMap, {}, true)).toStrictEqual({
      first_name: 'Jane',
    });
    expect(getUpdateValue('lastName', defaultConfig, formFieldsMap, {}, true)).toStrictEqual({
      last_name: 'Doe',
    });
    expect(getUpdateValue('email', defaultConfig, formFieldsMap, {}, true)).toStrictEqual({});

    formFieldsMap.email.value = 'jane.doe@example.com';

    // Should return the updated values for first name and email
    expect(getUpdateValue('firstName', defaultConfig, formFieldsMap, {})).toStrictEqual({
      first_name: 'Jane',
    });
    expect(getUpdateValue('lastName', defaultConfig, formFieldsMap, {})).toStrictEqual({});
    expect(getUpdateValue('email', defaultConfig, formFieldsMap, {})).toStrictEqual({
      email: 'jane.doe@example.com',
    });

    // Finally, should return values for all call when enforcing the form value
    expect(getUpdateValue('firstName', defaultConfig, formFieldsMap, {}, true)).toStrictEqual({
      first_name: 'Jane',
    });
    expect(getUpdateValue('lastName', defaultConfig, formFieldsMap, {}, true)).toStrictEqual({
      last_name: 'Doe',
    });
    expect(getUpdateValue('email', defaultConfig, formFieldsMap, {}, true)).toStrictEqual({
      email: 'jane.doe@example.com',
    });
  });
});
