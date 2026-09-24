/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appContextService } from '../app_context';

import { getManagedOtlpEndpoint, isManagedOtlpEndpoint } from './managed_otlp';

jest.mock('../app_context');

const mockedAppContextService = appContextService as jest.Mocked<typeof appContextService>;

const MANAGED_HOST = 'my-cluster.ingest.elastic.cloud';

describe('getManagedOtlpEndpoint', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns undefined when managedOtlp is absent', () => {
    mockedAppContextService.getCloud.mockReturnValue({} as any);
    expect(getManagedOtlpEndpoint()).toBeUndefined();
  });

  it('returns the url when managedOtlp is present', () => {
    mockedAppContextService.getCloud.mockReturnValue({
      managedOtlp: { url: MANAGED_HOST },
    } as any);
    expect(getManagedOtlpEndpoint()).toBe(MANAGED_HOST);
  });
});

describe('isManagedOtlpEndpoint', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns false when cloud.managedOtlp is absent', () => {
    mockedAppContextService.getCloud.mockReturnValue({} as any);
    expect(isManagedOtlpEndpoint(MANAGED_HOST)).toBe(false);
  });

  describe('when cloud.managedOtlp.url is set', () => {
    beforeEach(() => {
      mockedAppContextService.getCloud.mockReturnValue({
        managedOtlp: { url: MANAGED_HOST },
      } as any);
    });

    it.each([
      ['bare host', MANAGED_HOST],
      ['host:port (gRPC convention)', `${MANAGED_HOST}:4317`],
      ['https://host', `https://${MANAGED_HOST}`],
      ['https://host:443 (explicit default port)', `https://${MANAGED_HOST}:443`],
    ])('matches %s', (_label, endpoint) => {
      expect(isManagedOtlpEndpoint(endpoint)).toBe(true);
    });

    it.each([
      ['managed bulk path', `${MANAGED_HOST}/_es`],
      ['different host', 'other-cluster.ingest.elastic.cloud'],
      ['empty string', ''],
    ])('does not match %s', (_label, endpoint) => {
      expect(isManagedOtlpEndpoint(endpoint)).toBe(false);
    });
  });
});
