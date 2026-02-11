/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor } from '@testing-library/react';

import { createFleetTestRendererMock } from '../../../../../../../../mock';
import type { MockedFleetStartServices } from '../../../../../../../../mock';
import { useLicense } from '../../../../../../../../hooks/use_license';
import type { LicenseService } from '../../../../../../services';
import type { PackagePolicy } from '../../../../../../../../../common/types';

import { useOutputs } from './hooks';

jest.mock('../../../../../../../../hooks/use_license');

const mockedUseLicence = useLicense as jest.MockedFunction<typeof useLicense>;

function defaultHttpClientGetImplementation(path: any) {
  if (typeof path !== 'string') {
    throw new Error('Invalid request');
  }
  const err = new Error(`API [GET ${path}] is not MOCKED!`);
  // eslint-disable-next-line no-console
  console.log(err);
  throw err;
}

const mockApiCallsWithOutputs = (http: MockedFleetStartServices['http']) => {
  http.get.mockImplementation(async (path) => {
    if (typeof path !== 'string') {
      throw new Error('Invalid request');
    }
    if (path === '/api/fleet/outputs') {
      return {
        data: {
          items: [
            {
              id: 'output1',
              name: 'Output 1',
              is_default: true,
              is_default_monitoring: true,
              type: 'elasticsearch',
              is_internal: false,
            },
            {
              id: 'output2',
              name: 'Output 2',
              is_default: false,
              is_default_monitoring: false,
              type: 'elasticsearch',
              is_internal: false,
            },
            {
              id: 'internal-output',
              name: 'Internal Output',
              is_default: false,
              is_default_monitoring: false,
              type: 'elasticsearch',
              is_internal: true,
            },
          ],
        },
      };
    }

    return defaultHttpClientGetImplementation(path);
  });
};

const mockApiCallsWithOnlyInternalOutputs = (http: MockedFleetStartServices['http']) => {
  http.get.mockImplementation(async (path) => {
    if (typeof path !== 'string') {
      throw new Error('Invalid request');
    }
    if (path === '/api/fleet/outputs') {
      return {
        data: {
          items: [
            {
              id: 'internal-output-1',
              name: 'Internal Output 1',
              is_default: true,
              is_default_monitoring: true,
              type: 'elasticsearch',
              is_internal: true,
            },
            {
              id: 'internal-output-2',
              name: 'Internal Output 2',
              is_default: false,
              is_default_monitoring: false,
              type: 'elasticsearch',
              is_internal: true,
            },
          ],
        },
      };
    }

    return defaultHttpClientGetImplementation(path);
  });
};

describe('useOutputs', () => {
  const packagePolicy: Pick<PackagePolicy, 'supports_agentless'> = {
    supports_agentless: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should filter out internal outputs when license allows output per integration', async () => {
    const testRenderer = createFleetTestRendererMock();
    mockedUseLicence.mockReturnValue({
      hasAtLeast: () => true,
    } as unknown as LicenseService);
    mockApiCallsWithOutputs(testRenderer.startServices.http);

    const { result } = testRenderer.renderHook(() => useOutputs(packagePolicy, 'test-package'));
    expect(result.current.isLoading).toBeTruthy();

    await waitFor(() => expect(result.current.isLoading).toBeFalsy());

    // Should only return non-internal outputs
    expect(result.current.allowedOutputs).toHaveLength(2);
    expect(result.current.allowedOutputs.map((o) => o.id)).toEqual(['output1', 'output2']);
    expect(result.current.allowedOutputs.every((o) => !o.is_internal)).toBe(true);
  });

  it('should return empty array when all outputs are internal', async () => {
    const testRenderer = createFleetTestRendererMock();
    mockedUseLicence.mockReturnValue({
      hasAtLeast: () => true,
    } as unknown as LicenseService);
    mockApiCallsWithOnlyInternalOutputs(testRenderer.startServices.http);

    const { result } = testRenderer.renderHook(() => useOutputs(packagePolicy, 'test-package'));
    expect(result.current.isLoading).toBeTruthy();

    await waitFor(() => expect(result.current.isLoading).toBeFalsy());

    // Should return empty array since all outputs are internal
    expect(result.current.allowedOutputs).toHaveLength(0);
  });
});
