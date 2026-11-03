/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getExternalIncidentEventId } from './external_incident_topic';

const data = { spaceId: 'default', connectorId: 'jira-1', externalId: '10001' };

describe('getExternalIncidentEventId', () => {
  it('returns the same id for the same change of the same incident', () => {
    const updatedAt = '2026-09-30T10:00:00.000+0000';

    expect(getExternalIncidentEventId({ ...data, updatedAt })).toBe(
      getExternalIncidentEventId({ ...data, updatedAt })
    );
  });

  it('returns another id for another change or another incident', () => {
    const first = getExternalIncidentEventId({ ...data, updatedAt: '1' });

    expect(getExternalIncidentEventId({ ...data, updatedAt: '2' })).not.toBe(first);
    expect(getExternalIncidentEventId({ ...data, externalId: '10002', updatedAt: '1' })).not.toBe(
      first
    );
  });

  it('returns a new id for every notification without a change time', () => {
    expect(getExternalIncidentEventId(data)).not.toBe(getExternalIncidentEventId(data));
  });

  it('fits the execution id limit of a service account workload', () => {
    expect(getExternalIncidentEventId({ ...data, updatedAt: 'x'.repeat(64) }).length).toBe(64);
  });
});
