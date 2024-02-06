/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createFormSection, createFormSectionsMap } from './form_section';

describe('createFormSection', () => {
  it('should create a form section with default values', () => {
    expect(createFormSection('mySection')).toStrictEqual({
      configFieldName: undefined,
      defaultEnabled: false,
      enabled: false,
      formSectionName: 'mySection',
    });
  });

  it('should create a form section based on a config path', () => {
    expect(
      createFormSection('retentionPolicy', 'retention_policy', {
        retention_policy: null,
      })
    ).toStrictEqual({
      configFieldName: 'retention_policy',
      defaultEnabled: false,
      enabled: false,
      formSectionName: 'retentionPolicy',
    });
  });

  it('should create a form section with overloads', () => {
    expect(
      createFormSection(
        'retentionPolicy',
        'retention_policy',
        {
          retention_policy: null,
        },
        { defaultEnabled: true }
      )
    ).toStrictEqual({
      configFieldName: 'retention_policy',
      defaultEnabled: true,
      enabled: true,
      formSectionName: 'retentionPolicy',
    });
  });
});

describe('createFormFieldsMap', () => {
  it('should create a map of form fields', () => {
    expect(
      createFormSectionsMap([createFormSection('simple'), createFormSection('advanced')])
    ).toStrictEqual({
      advanced: {
        configFieldName: undefined,
        defaultEnabled: false,
        enabled: false,
        formSectionName: 'advanced',
      },
      simple: {
        configFieldName: undefined,
        defaultEnabled: false,
        enabled: false,
        formSectionName: 'simple',
      },
    });
  });
});
