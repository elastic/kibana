/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildIndexNameWithNamespace,
  InvalidNamespaceError,
} from './build_index_name_with_namespace';

describe('buildIndexNameWithNamespace', () => {
  it.each(['default', 'team.a', 'namespace+plus', 'test😀', '_internal', 'namespace_1'])(
    'builds an index name for valid namespace "%s"',
    (namespace) => {
      expect(buildIndexNameWithNamespace('logs-osquery_manager.result*', namespace)).toBe(
        `logs-osquery_manager.result-${namespace}`
      );
    }
  );

  it.each([
    '',
    'Default',
    'namespace-with-dash',
    '-leading',
    'with,comma',
    'with*wildcard',
    'with:colon',
    'a b',
    'with/slash',
    `testlength${'😀'.repeat(50)}`,
  ])('rejects invalid namespace "%s"', (namespace) => {
    expect(() => buildIndexNameWithNamespace('logs-osquery_manager.result*', namespace)).toThrow(
      'Invalid integration namespace'
    );
  });

  it('throws an InvalidNamespaceError carrying a 400 status code', () => {
    expect.assertions(2);

    try {
      buildIndexNameWithNamespace('logs-osquery_manager.result*', 'with:colon');
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidNamespaceError);
      expect((error as InvalidNamespaceError).statusCode).toBe(400);
    }
  });
});
