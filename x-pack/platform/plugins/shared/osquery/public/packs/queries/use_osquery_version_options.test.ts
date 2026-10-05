/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { FALLBACK_OSQUERY_VERSION } from '../../../common/constants';
import { useOsquerySchema } from '../../common/hooks/use_osquery_schema';
import { useOsqueryVersionOptions } from './use_osquery_version_options';

jest.mock('../../common/hooks/use_osquery_schema', () => ({
  useOsquerySchema: jest.fn(),
}));

const mockUseOsquerySchema = useOsquerySchema as jest.MockedFunction<typeof useOsquerySchema>;

const mockSchema = (overrides: Partial<ReturnType<typeof useOsquerySchema>>) =>
  mockUseOsquerySchema.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    osqueryVersion: FALLBACK_OSQUERY_VERSION,
    pkgVersion: undefined,
    ...overrides,
  });

describe('useOsqueryVersionOptions', () => {
  describe('helpText', () => {
    it('should name the detected osquery and integration versions when the package is installed', () => {
      mockSchema({ osqueryVersion: '5.23.1', pkgVersion: '1.35.0' });

      const { result } = renderHook(() => useOsqueryVersionOptions());

      expect(result.current.helpText).toBe(
        'osquery agent version, not the integration version. Detected: 5.23.1 (Osquery Manager 1.35.0)'
      );
      expect(result.current.options[0].label).toBe('5.23.1');
    });

    it('should not claim detection when the server serves the fallback schema', () => {
      mockSchema({ osqueryVersion: FALLBACK_OSQUERY_VERSION, pkgVersion: undefined });

      const { result } = renderHook(() => useOsqueryVersionOptions());

      expect(result.current.helpText).toBe(
        `osquery agent version, not the integration version. Installed osquery version not detected; listing versions up to ${FALLBACK_OSQUERY_VERSION}.`
      );
    });

    it('should not claim detection when the version is the integration version (missing metadata)', () => {
      mockSchema({ osqueryVersion: '1.35.0', pkgVersion: '1.35.0' });

      const { result } = renderHook(() => useOsqueryVersionOptions());

      expect(result.current.helpText).toMatch(/not detected/);
      expect(result.current.options[0].label).toBe(FALLBACK_OSQUERY_VERSION);
    });

    it('should show only the base text while the schema is loading', () => {
      mockSchema({ isLoading: true });

      const { result } = renderHook(() => useOsqueryVersionOptions());

      expect(result.current.helpText).toBe('osquery agent version, not the integration version.');
    });
  });
});
