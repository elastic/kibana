/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IntegrationResponse } from './model/common_attributes.gen';
import {
  canEditDataStreamFieldTypes,
  getFieldTypeEditState,
  getLastApprovedDataStreamIds,
} from './can_edit_field_types';

describe('canEditDataStreamFieldTypes', () => {
  it('allows edits when the integration has never been approved', () => {
    expect(
      canEditDataStreamFieldTypes({
        dataStreamId: 'ds1',
        lastApprovedDataStreamIds: undefined,
      })
    ).toBe(true);
  });

  it('allows edits when the approved stream list is empty', () => {
    expect(
      canEditDataStreamFieldTypes({
        dataStreamId: 'ds1',
        lastApprovedDataStreamIds: [],
      })
    ).toBe(true);
  });

  it('locks a data stream that was included in the last approved package', () => {
    expect(
      canEditDataStreamFieldTypes({
        dataStreamId: 'ds1',
        lastApprovedDataStreamIds: ['ds1'],
      })
    ).toBe(false);
  });

  it('allows edits on a data stream added after the last approval', () => {
    expect(
      canEditDataStreamFieldTypes({
        dataStreamId: 'ds2',
        lastApprovedDataStreamIds: ['ds1'],
      })
    ).toBe(true);
  });

  it('locks every stream that shipped in the last approval', () => {
    expect(
      canEditDataStreamFieldTypes({
        dataStreamId: 'ds1',
        lastApprovedDataStreamIds: ['ds1', 'ds2'],
      })
    ).toBe(false);
    expect(
      canEditDataStreamFieldTypes({
        dataStreamId: 'ds2',
        lastApprovedDataStreamIds: ['ds1', 'ds2'],
      })
    ).toBe(false);
  });
});

describe('getLastApprovedDataStreamIds', () => {
  const baseIntegration: IntegrationResponse = {
    integrationId: 'int-1',
    title: 'Test',
    description: 'desc',
    status: 'approved',
    dataStreams: [],
  };

  it('returns undefined when the integration is missing', () => {
    expect(getLastApprovedDataStreamIds(undefined)).toBeUndefined();
  });

  it('returns undefined when the extra field is absent', () => {
    expect(getLastApprovedDataStreamIds(baseIntegration)).toBeUndefined();
  });

  it('returns the stamped data stream ids', () => {
    const integration: IntegrationResponse = {
      ...baseIntegration,
      lastApprovedDataStreamIds: ['ds1', 'ds2'],
    };
    expect(getLastApprovedDataStreamIds(integration)).toEqual(['ds1', 'ds2']);
  });
});

describe('getFieldTypeEditState', () => {
  const dataStream = {
    dataStreamId: 'ds1',
    title: 'Test',
    description: 'desc',
    inputTypes: [],
    status: 'completed' as const,
  };
  const integration: IntegrationResponse = {
    integrationId: 'int-1',
    title: 'Test',
    description: 'desc',
    status: 'completed',
    dataStreams: [dataStream],
  };

  it('does not fail open while integration state is unavailable', () => {
    expect(
      getFieldTypeEditState({ integration, dataStream, isLoading: true, isError: false })
    ).toBe('loading');
    expect(
      getFieldTypeEditState({
        integration: undefined,
        dataStream,
        isLoading: false,
        isError: true,
      })
    ).toBe('error');
  });

  it('distinguishes reanalysis and approval locking', () => {
    expect(
      getFieldTypeEditState({
        integration: {
          ...integration,
          dataStreams: [{ ...dataStream, status: 'processing' }],
        },
        dataStream,
        isLoading: false,
        isError: false,
      })
    ).toBe('reanalyzing');
    expect(
      getFieldTypeEditState({
        integration: { ...integration, lastApprovedDataStreamIds: ['ds1'] },
        dataStream,
        isLoading: false,
        isError: false,
      })
    ).toBe('locked');
  });
});
