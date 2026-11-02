/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProfileFormValues } from './profile_form_types';
import {
  TARGET_TYPE_DATA_VIEW,
  TARGET_TYPE_INDEX,
  TARGET_TYPE_INDEX_PATTERN,
} from '../target_types';
import { validateProfileForm } from './validate_profile_form';

const createValidValues = (): ProfileFormValues => ({
  name: 'Logs profile',
  description: 'Applies anonymization to logs fields',
  targetType: TARGET_TYPE_INDEX_PATTERN,
  targetId: 'logs-*',
  fieldRules: [{ field: 'host.name', allowed: true, anonymized: true, entityClass: 'HOST_NAME' }],
  regexRules: [
    {
      id: 'regex-1',
      type: 'regex',
      pattern: '[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}',
      entityClass: 'EMAIL',
      enabled: true,
    },
  ],
  nerRules: [
    {
      id: 'ner-1',
      type: 'ner',
      modelId: 'model-1',
      allowedEntityClasses: ['PER', 'ORG'],
      enabled: true,
    },
  ],
});

describe('validateProfileForm', () => {
  it('returns no errors for valid values', () => {
    expect(validateProfileForm(createValidValues())).toEqual({});
  });

  it('validates required name and target id', () => {
    const values = createValidValues();
    values.name = '   ';
    values.targetId = '   ';

    expect(validateProfileForm(values)).toEqual({
      name: 'Profile name is required',
      targetId: 'Target identifier is required',
    });
  });

  it('rejects wildcard target id for data_view targets', () => {
    const values = createValidValues();
    values.targetType = TARGET_TYPE_DATA_VIEW;
    values.targetId = 'logs-*';

    expect(validateProfileForm(values)).toEqual({
      targetId: 'Data view target id must be a saved object id, not a wildcard pattern',
    });
  });

  it('rejects wildcard target id for index targets', () => {
    const values = createValidValues();
    values.targetType = TARGET_TYPE_INDEX;
    values.targetId = 'logs-*';

    expect(validateProfileForm(values)).toEqual({
      targetId: 'Index target id must be a concrete index name',
    });
  });

  it('requires entity class for anonymized field rules', () => {
    const values = createValidValues();
    values.fieldRules = [
      {
        field: 'host.name',
        allowed: true,
        anonymized: true,
        entityClass: undefined,
      },
    ];

    expect(validateProfileForm(values)).toEqual({
      fieldRules: 'Entity class is required for anonymized fields',
    });
  });

  it('requires pattern and entity class for regex rules', () => {
    const values = createValidValues();
    values.regexRules = [
      {
        id: 'regex-1',
        type: 'regex',
        pattern: '',
        entityClass: 'EMAIL',
        enabled: true,
      },
    ];

    expect(validateProfileForm(values)).toEqual({
      regexRules: 'Regex pattern and entity class are required for regex rules',
    });
  });

  it('requires model id and valid allowed entity classes for NER rules', () => {
    const values = createValidValues();
    values.nerRules = [
      {
        id: 'ner-1',
        type: 'ner',
        modelId: '',
        allowedEntityClasses: [],
        enabled: true,
      },
    ];

    expect(validateProfileForm(values)).toEqual({
      nerRules:
        'NER model id is required and allowed entities must be selected from PER, ORG, LOC, MISC.',
    });
  });

  it('accepts missing modelId in NER rules by using default fallback', () => {
    const values = createValidValues();
    values.nerRules = [
      {
        id: 'ner-1',
        type: 'ner',
        modelId: undefined,
        allowedEntityClasses: ['PER', 'ORG'],
        enabled: true,
      },
    ];

    expect(validateProfileForm(values)).toEqual({});
  });
});
