/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createFormField, createFormFieldsMap } from './form_field';
import { applyFormStateToConfig } from './apply_form_state_to_config';

interface Config {
  first_name: string;
  last_name: string;
  email?: string;
}

describe('applyFormStateToConfig', () => {
  it('should apply the form state', () => {
    const defaultConfig: Config = { first_name: 'John', last_name: 'Doe' };
    const firstName = createFormField('firstName', 'first_name', defaultConfig);
    const lastName = createFormField('lastName', 'last_name', defaultConfig);
    const email = createFormField('email', 'email', defaultConfig, { isOptional: true });
    const formFieldsMap = createFormFieldsMap([firstName, lastName, email]);

    formFieldsMap.firstName.value = 'Jane';

    // should return changed values only
    expect(applyFormStateToConfig(defaultConfig, formFieldsMap, {})).toStrictEqual({
      first_name: 'Jane',
    });
    // should return the full config object
    expect(applyFormStateToConfig(defaultConfig, formFieldsMap, {}, true)).toStrictEqual({
      first_name: 'Jane',
      last_name: 'Doe',
    });

    formFieldsMap.email.value = 'jane.doe@example.com';

    // should return changed values only
    expect(applyFormStateToConfig(defaultConfig, formFieldsMap, {})).toStrictEqual({
      email: 'jane.doe@example.com',
      first_name: 'Jane',
    });
    // should return the full config object
    expect(applyFormStateToConfig(defaultConfig, formFieldsMap, {}, true)).toStrictEqual({
      email: 'jane.doe@example.com',
      first_name: 'Jane',
      last_name: 'Doe',
    });
  });
});
