/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EpmPackageResponse } from './api';
import { getIntegrationNameFromResponse } from './api_parsers';

describe('getIntegrationNameFromResponse', () => {
  it.each([
    ['audit-security.data-stream-1.0.0', 'security-1.0.0'],
    ['audit-endpoint_security.data_stream-1.0.0', 'endpoint_security-1.0.0'],
    ['audit-endpoint_security_2.data_stream-1.0.0', 'endpoint_security_2-1.0.0'],
    ['audit-endpoint_security.data_stream-1.0.0-power', 'endpoint_security-1.0.0'],
  ])(
    'should return the integration name from the ingest pipeline name %s',
    (ingestPipelineName, expected) => {
      const response = {
        items: [{ id: ingestPipelineName, type: 'ingest_pipeline' }],
      } as EpmPackageResponse;
      expect(getIntegrationNameFromResponse(response)).toEqual(expected);
    }
  );
  it('should return an empty string if the response is empty', () => {
    const response = { items: [] } as unknown as EpmPackageResponse;
    expect(getIntegrationNameFromResponse(response)).toEqual('');
  });
  it('should return an empty string if the response is undefined', () => {
    const response = {} as EpmPackageResponse;
    expect(getIntegrationNameFromResponse(response)).toEqual('');
  });
  it('should return an empty string if the response is null', () => {
    const response = { items: null } as unknown as EpmPackageResponse;
    expect(getIntegrationNameFromResponse(response)).toEqual('');
  });
  it('should return the integration name from the ingest pipeline name', () => {
    const response = {
      items: [
        { type: 'ingest_pipeline', id: 'audit-security.data-stream-1.0.0' },
        { type: 'other', id: 'some-id' },
      ],
    } as unknown as EpmPackageResponse;
    expect(getIntegrationNameFromResponse(response)).toEqual('security-1.0.0');
  });

  it('should return an empty string if the response does not contain an ingest pipeline item', () => {
    const response = {
      items: [
        { type: 'other', id: 'some-id' },
        { type: 'another', id: 'another-id' },
      ],
    } as unknown as EpmPackageResponse;
    expect(getIntegrationNameFromResponse(response)).toEqual('');
  });

  it('should return an empty string if the ingest pipeline name does not match the expected pattern', () => {
    const response = {
      items: [{ type: 'ingest_pipeline', id: 'invalid-pipeline-name' }],
    } as EpmPackageResponse;
    expect(getIntegrationNameFromResponse(response)).toEqual('');
  });
});
