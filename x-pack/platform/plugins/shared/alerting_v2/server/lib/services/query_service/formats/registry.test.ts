/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { arrowFormat } from './arrow_format';
import { jsonFormat } from './json_format';
import {
  DEFAULT_ESQL_RESPONSE_FORMAT,
  ESQL_RESPONSE_FORMAT_NAMES,
  findEsqlResponseFormat,
} from './registry';

describe('ES|QL response format registry', () => {
  it('lists every registered format name', () => {
    expect(ESQL_RESPONSE_FORMAT_NAMES).toEqual(['json', 'arrow']);
  });

  it('defaults to json', () => {
    expect(DEFAULT_ESQL_RESPONSE_FORMAT).toBe(jsonFormat);
  });

  it('resolves each registered name to its format', () => {
    expect(findEsqlResponseFormat('json')).toBe(jsonFormat);
    expect(findEsqlResponseFormat('arrow')).toBe(arrowFormat);
  });

  it('returns undefined for an unregistered name', () => {
    expect(findEsqlResponseFormat('csv')).toBeUndefined();
  });
});
