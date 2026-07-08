/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getWorkdayConnectorType } from '.';

describe('getWorkdayConnectorType', () => {
  const t = getWorkdayConnectorType();
  it('has the .workday connector id', () => {
    expect(t.id).toBe('.workday');
  });
  it('advertises alerting, cases, workflows and agentBuilder feature ids', () => {
    expect(t.supportedFeatureIds).toEqual(
      expect.arrayContaining(['alerting', 'cases', 'workflows', 'agentBuilder'])
    );
  });
  it('requires at least platinum license', () => {
    expect(t.minimumLicenseRequired).toBe('platinum');
  });
  it('has config + secrets validators wired to the URL allow-list', () => {
    expect(t.validators?.length).toBe(2);
  });
});
