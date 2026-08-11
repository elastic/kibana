/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateSubActionParamsJson } from './validation';
import { mcpParamsErrorStrings } from '../translations';

describe('validateSubActionParamsJson', () => {
  it('returns required error when params is empty', () => {
    expect(validateSubActionParamsJson('')).toEqual([mcpParamsErrorStrings.required]);
    expect(validateSubActionParamsJson(undefined)).toEqual([mcpParamsErrorStrings.required]);
  });

  it('returns invalidJson error when params is not valid JSON', () => {
    expect(validateSubActionParamsJson('{"foo":')).toEqual([mcpParamsErrorStrings.invalidJson]);
  });

  it('returns no errors for valid JSON', () => {
    expect(validateSubActionParamsJson('{"foo":"bar"}')).toEqual([]);
  });
});
