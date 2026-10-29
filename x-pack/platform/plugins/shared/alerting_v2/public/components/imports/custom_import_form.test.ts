/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEFAULT_CUSTOM_IMPORT_FORM_STATE,
  getSetupStepLabel,
  parseImportRequestError,
  toCreateImportData,
  toImportSource,
  validateFingerprintField,
  validateName,
  validateSource,
} from './custom_import_form';

describe('toImportSource', () => {
  it('slugs the name', () => {
    expect(toImportSource('Datadog Monitors!')).toBe('datadog-monitors');
  });

  it('is empty for a name without letters or digits', () => {
    expect(toImportSource('   ')).toBe('');
    expect(toImportSource('---')).toBe('');
  });

  it('never starts with the reserved prefix', () => {
    expect(toImportSource('Elastic things')).toBe('custom-elastic-things');
  });
});

describe('validators', () => {
  it('requires a name', () => {
    expect(validateName('  ')).toEqual(expect.any(String));
    expect(validateName('Datadog')).toBe(true);
  });

  it('rejects a source that starts with elastic and accepts an empty one', () => {
    expect(validateSource('elastic-x')).toEqual(expect.any(String));
    expect(validateSource('')).toBe(true);
    expect(validateSource('datadog')).toBe(true);
  });

  it.each(['monitor_id', 'labels.env', 'a-b.c_d.e1'])(
    'accepts the fingerprint field %s',
    (value) => {
      expect(validateFingerprintField(value)).toBe(true);
    }
  );

  it.each(['labels..env', '.env', 'env.', 'my field', 'a/b'])(
    'rejects the fingerprint field %s',
    (value) => {
      expect(validateFingerprintField(value)).toEqual(expect.any(String));
    }
  );

  it('accepts an empty fingerprint field', () => {
    expect(validateFingerprintField('')).toBe(true);
  });
});

describe('toCreateImportData', () => {
  it('sends only the name and the default severity for an untouched form', () => {
    expect(toCreateImportData({ ...DEFAULT_CUSTOM_IMPORT_FORM_STATE, name: ' Datadog ' })).toEqual({
      name: 'Datadog',
      default_severity: 'medium',
    });
  });

  it('maps every filled field', () => {
    expect(
      toCreateImportData({
        name: 'Datadog',
        description: 'Monitors',
        source: 'dd',
        defaultSeverity: 'high',
        fingerprintField: 'monitor_id',
        tags: ['a'],
        routingTags: ['b'],
        owner: 'me',
      })
    ).toEqual({
      name: 'Datadog',
      description: 'Monitors',
      source: 'dd',
      default_severity: 'high',
      fingerprint_field: 'monitor_id',
      tags: ['a'],
      routing_tags: ['b'],
      owner: 'me',
    });
  });
});

describe('parseImportRequestError', () => {
  it('reads the message and failed step from the server body', () => {
    expect(
      parseImportRequestError({
        message: 'Bad Request',
        body: {
          message: 'Could not create the workflow',
          details: { step: 'create_workflow', rolled_back: true },
        },
      })
    ).toEqual({
      message: 'Could not create the workflow',
      step: 'create_workflow',
      rolledBack: true,
    });
  });

  it('falls back to the error message', () => {
    expect(parseImportRequestError(new Error('boom'))).toEqual({ message: 'boom' });
  });

  it('labels known steps and passes unknown ones through', () => {
    expect(getSetupStepLabel('create_connector')).toBe('Creating the webhook connector');
    expect(getSetupStepLabel('other')).toBe('other');
  });
});
