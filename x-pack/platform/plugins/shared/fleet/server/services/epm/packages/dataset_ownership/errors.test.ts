/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fleetErrorToResponseOptions } from '../../../../errors/handlers';

import { DatasetClaimConflictError, DatasetOwnershipConflictError } from './errors';

jest.mock('../../../app_context', () => ({
  appContextService: { getLogger: () => ({ error: jest.fn(), warn: jest.fn() }) },
}));

describe('dataset ownership errors', () => {
  it('maps an ownership conflict to 409 and keeps the message', () => {
    const result = fleetErrorToResponseOptions(
      new DatasetOwnershipConflictError('logs-payroll.records-teamb is not owned')
    );

    expect(result.statusCode).toBe(409);
    expect(result.body.message).toContain('logs-payroll.records-teamb');
  });

  it('maps a claim conflict to 409', () => {
    expect(fleetErrorToResponseOptions(new DatasetClaimConflictError('claimed')).statusCode).toBe(
      409
    );
  });
});
