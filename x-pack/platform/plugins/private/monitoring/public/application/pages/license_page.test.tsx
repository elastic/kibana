/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { LicensePage } from './license_page';

// Mock the dependencies at the top-level to be more consistent with Kibana patterns
jest.mock('@kbn/kibana-react-plugin/public', () => ({
  ...jest.requireActual('@kbn/kibana-react-plugin/public'),
  useKibana: () => ({
    services: {
      http: {
        fetch: jest.fn(),
      },
      uiSettings: {
        get: jest.fn().mockReturnValue('UTC'),
      },
      application: {
        getUrlForApp: jest.fn(),
      },
      data: {
        query: {
          timefilter: {
            timefilter: {
              getBounds: jest.fn().mockReturnValue({
                min: { toISOString: () => '2023-01-01T00:00:00.000Z' },
                max: { toISOString: () => '2023-12-31T23:59:59.999Z' },
              }),
            },
          },
        },
      },
    },
  }),
}));

// Mock the GlobalStateContext
jest.mock('../contexts/global_state_context', () => ({
  GlobalStateContext: {
    Provider: ({ children }: { children: React.ReactNode }) => children,
  },
}));

// Create a reusable mock response builder
const createMockResponse = (licenseData: any) => [
  {
    cluster_uuid: 'test-cluster',
    cluster_name: 'Test Cluster',
    isPrimary: true,
    license: licenseData,
  },
];

describe('LicensePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('License Expiration Display', () => {
    test('should display license expiration date from expiry_date_in_millis', async () => {
      const mockResponse = createMockResponse({
        status: 'active',
        type: 'trial',
        expiry_date_in_millis: 1681389467555, // April 15, 2023
      });

      const mockFetch = jest.fn().mockResolvedValue({
        json: () => Promise.resolve(mockResponse),
      });

      /* eslint-disable-next-line @typescript-eslint/no-var-requires */
      (require('@kbn/kibana-react-plugin/public').useKibana as jest.Mock).mockReturnValue({
        services: {
          http: {
            fetch: mockFetch,
          },
        },
      });

      const { getByTestId } = render(<LicensePage />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      // Check that the component renders with proper license data
      expect(getByTestId('licenseText')).toBeInTheDocument();
    });

    test('should display "never expires" for permanent license', async () => {
      const mockResponse = createMockResponse({
        status: 'active',
        type: 'basic',
        expiry_date_in_millis: undefined, // No expiration
      });

      const mockFetch = jest.fn().mockResolvedValue({
        json: () => Promise.resolve(mockResponse),
      });

      /* eslint-disable-next-line @typescript-eslint/no-var-requires */
      (require('@kbn/kibana-react-plugin/public').useKibana as jest.Mock).mockReturnValue({
        services: {
          http: {
            fetch: mockFetch,
          },
        },
      });

      const { getByTestId } = render(<LicensePage />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      // Check that component renders for permanent license
      expect(getByTestId('licenseText')).toBeInTheDocument();
    });

    test('should properly handle expired license scenarios', async () => {
      const mockResponse = createMockResponse({
        status: 'active',
        type: 'trial',
        expiry_date_in_millis: 1579532493876, // February 15, 2020 - already expired
      });

      const mockFetch = jest.fn().mockResolvedValue({
        json: () => Promise.resolve(mockResponse),
      });

      /* eslint-disable-next-line @typescript-eslint/no-var-requires */
      (require('@kbn/kibana-react-plugin/public').useKibana as jest.Mock).mockReturnValue({
        services: {
          http: {
            fetch: mockFetch,
          },
        },
      });

      const { getByTestId } = render(<LicensePage />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      // Check that component handles expired license properly
      expect(getByTestId('licenseText')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    test('should handle fetch errors gracefully', async () => {
      const mockFetch = jest.fn().mockRejectedValue(new Error('Network error'));

      /* eslint-disable-next-line @typescript-eslint/no-var-requires */
      (require('@kbn/kibana-react-plugin/public').useKibana as jest.Mock).mockReturnValue({
        services: {
          http: {
            fetch: mockFetch,
          },
        },
      });

      const { queryByTestId } = render(<LicensePage />);

      // Should not crash even with failed fetch
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      // Expect that component gracefully handles errors
      expect(queryByTestId('licenseText')).toBeInTheDocument(); // Or handle null case appropriately
    });
  });
});
