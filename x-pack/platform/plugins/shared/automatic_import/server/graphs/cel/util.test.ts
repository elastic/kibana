/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getRedactVariables,
  getStateVarsAndDefaultValues,
  getStateVarsConfigDetails,
} from './util';
import {
  celStateDetailsMockedResponse,
  celStateSettings,
  celRedact,
  celConfigFields,
} from '../../../__jest__/fixtures/cel';

describe('getCelInputDetails', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
  });

  it('getRedactVariables', () => {
    const result = getRedactVariables(celStateDetailsMockedResponse);
    expect(result).toStrictEqual(celRedact);
  });

  it('getStateVarsAndDefaultValues', () => {
    const result = getStateVarsAndDefaultValues(celStateDetailsMockedResponse);
    expect(result).toStrictEqual(celStateSettings);
  });

  it('getStateVarsConfigDetails', () => {
    const result = getStateVarsConfigDetails(celStateDetailsMockedResponse);
    expect(result).toStrictEqual(celConfigFields);
  });
});
