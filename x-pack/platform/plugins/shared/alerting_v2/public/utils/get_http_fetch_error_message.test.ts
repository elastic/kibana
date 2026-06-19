/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addHttpFetchErrorToast, getHttpFetchErrorMessage } from './get_http_fetch_error_message';

describe('getHttpFetchErrorMessage', () => {
  it('returns the server message from an HTTP fetch error body', () => {
    expect(
      getHttpFetchErrorMessage({
        body: {
          message:
            'ES|QL query cannot be executed using the Arrow format required for rule evaluation: flattened is not supported by the Arrow format',
        },
      })
    ).toBe(
      'ES|QL query cannot be executed using the Arrow format required for rule evaluation: flattened is not supported by the Arrow format'
    );
  });

  it('returns undefined when no server message is present', () => {
    expect(getHttpFetchErrorMessage(new Error('network error'))).toBeUndefined();
  });
});

describe('addHttpFetchErrorToast', () => {
  it('shows title and server message when available', () => {
    const addDanger = jest.fn();

    addHttpFetchErrorToast({ addDanger }, 'Failed to create rule', {
      body: {
        message:
          'ES|QL query cannot be executed using the Arrow format required for rule evaluation: bad query',
      },
    });

    expect(addDanger).toHaveBeenCalledWith({
      title: 'Failed to create rule',
      text: 'ES|QL query cannot be executed using the Arrow format required for rule evaluation: bad query',
    });
  });

  it('shows only the title when no server message is available', () => {
    const addDanger = jest.fn();

    addHttpFetchErrorToast({ addDanger }, 'Failed to create rule', new Error('network error'));

    expect(addDanger).toHaveBeenCalledWith('Failed to create rule');
  });
});
