/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  formatFlyoutSaveError,
  formatFlyoutSaveErrorForCallout,
  getElasticsearchErrorTypeLabel,
  getFlyoutSaveErrorMessage,
} from './get_flyout_save_error_message';

describe('getElasticsearchErrorTypeLabel', () => {
  it('maps known elasticsearch error types to readable titles', () => {
    expect(getElasticsearchErrorTypeLabel('validation_exception')).toBe('Validation failed');
    expect(getElasticsearchErrorTypeLabel('index_not_found_exception')).toBe('Index not found');
  });

  it('humanizes unknown elasticsearch error types', () => {
    expect(getElasticsearchErrorTypeLabel('some_custom_exception')).toBe('Some Custom Exception');
  });
});

describe('formatFlyoutSaveErrorForCallout', () => {
  it('splits elasticsearch root cause errors into readable title and body', () => {
    const message =
      'validation_exception Root causes: validation_exception: Validation Failed: 1: unknown setting [late_materialization]; known settings: [max_errors]';

    expect(formatFlyoutSaveErrorForCallout(message)).toEqual({
      title: 'Validation failed',
      body: 'unknown setting [late_materialization]; known settings: [max_errors]',
    });
  });

  it('handles multiline elasticsearch errors', () => {
    const message = `validation_exception
	Root causes:
		validation_exception: Validation Failed: 1: unknown setting [late_materialization]`;

    expect(formatFlyoutSaveErrorForCallout(message)).toEqual({
      title: 'Validation failed',
      body: 'unknown setting [late_materialization]',
    });
  });

  it('uses a generic title for simple validation messages', () => {
    expect(formatFlyoutSaveErrorForCallout('Name is required.')).toEqual({
      title: 'Unable to save',
      body: 'Name is required.',
    });
  });
});

describe('formatFlyoutSaveError', () => {
  it('returns readable toast text', () => {
    const message =
      'validation_exception Root causes: validation_exception: Validation Failed: 1: unknown setting [late_materialization]';

    expect(formatFlyoutSaveError(message)).toEqual({
      title: 'Validation failed',
      body: 'unknown setting [late_materialization]',
      toastText: 'unknown setting [late_materialization]',
    });
  });
});

describe('getFlyoutSaveErrorMessage', () => {
  it('returns readable toast text for Error instances', () => {
    expect(getFlyoutSaveErrorMessage(new Error('Name is required.'))).toBe('Name is required.');
  });
});
