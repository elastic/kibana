/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionVariable } from '@kbn/alerting-plugin/common';
import { validateParamsForWarnings } from './validate_params_for_warnings';

describe('validateParamsForWarnings', () => {
  const actionVariables: ActionVariable[] = [
    {
      name: 'context.url',
      description: 'Test url',
      usesPublicBaseUrl: true,
    },
    {
      name: 'context.name',
      description: 'Test name',
    },
  ];

  test('returns warnings when publicUrl is not set and there are publicUrl variables used', () => {
    const warning =
      'server.publicBaseUrl is not set. Generated URLs will be either relative or empty.';
    expect(
      validateParamsForWarnings('Test for {{context.url}}', undefined, actionVariables)
    ).toEqual(warning);

    expect(
      validateParamsForWarnings('link: {{ context.url }}', undefined, actionVariables)
    ).toEqual(warning);

    expect(
      validateParamsForWarnings('{{=<% %>=}}link: <%context.url%>', undefined, actionVariables)
    ).toEqual(warning);
  });

  test('does not return warnings when publicUrl is not set and there are publicUrl variables not used', () => {
    expect(
      validateParamsForWarnings('Test for {{context.name}}', undefined, actionVariables)
    ).toBeFalsy();
  });

  test('does not return warnings when publicUrl is set and there are publicUrl variables used', () => {
    expect(
      validateParamsForWarnings('Test for {{context.url}}', 'http://test', actionVariables)
    ).toBeFalsy();
  });

  test('does not returns warnings when publicUrl is not set and the value is not a string', () => {
    expect(validateParamsForWarnings(10, undefined, actionVariables)).toBeFalsy();
  });

  test('does not throw an error when passing in invalid mustache', () => {
    expect(() => validateParamsForWarnings('{{', undefined, actionVariables)).not.toThrowError();
  });
});
