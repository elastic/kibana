/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseStatuses } from '../../../common/types/domain';
import { parseItsmIncident, parseSirIncident } from './parse_incident';

const incident = {
  sys_id: '123',
  number: 'INC01',
  short_description: 'A title',
  description: 'A description',
  state: '6',
  sys_updated_on: '2026-09-30 10:00:00',
  sys_updated_by: 'admin',
};

describe('servicenow parseIncident', () => {
  it('maps the ITSM incident fields', () => {
    expect(parseItsmIncident(incident)).toEqual({
      title: 'A title',
      description: 'A description',
      status: CaseStatuses.closed,
      updatedAt: '2026-09-30 10:00:00',
      updatedBy: 'admin',
    });
  });

  it.each([
    ['1', CaseStatuses.open],
    ['2', CaseStatuses['in-progress']],
    ['3', CaseStatuses['in-progress']],
    ['7', CaseStatuses.closed],
    ['8', CaseStatuses.closed],
  ])('maps ITSM state %s', (state, status) => {
    expect(parseItsmIncident({ state }).status).toBe(status);
  });

  it.each([
    ['1', CaseStatuses.open],
    ['10', CaseStatuses['in-progress']],
    ['100', CaseStatuses['in-progress']],
    ['3', CaseStatuses.closed],
    ['7', CaseStatuses.closed],
  ])('maps SIR state %s', (state, status) => {
    expect(parseSirIncident({ state }).status).toBe(status);
  });

  it('leaves unknown states and non-string values undefined', () => {
    expect(parseItsmIncident({ state: '42', short_description: { value: 'x' } })).toEqual({
      title: undefined,
      description: undefined,
      status: undefined,
      updatedAt: undefined,
      updatedBy: undefined,
    });
  });
});
