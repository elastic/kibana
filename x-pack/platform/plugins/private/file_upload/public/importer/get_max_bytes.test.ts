/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ABSOLUTE_MAX_FILE_SIZE_BYTES,
  MAX_TIKA_FILE_SIZE_BYTES,
} from '@kbn/file-upload-common/src/constants';

import {
  getMaxBytes,
  getMaxBytesFormatted,
  getMaxTikaBytes,
  getMaxTikaBytesFormatted,
} from './get_max_bytes';

jest.mock('../kibana_services', () => ({
  getUiSettings: jest.fn(),
}));

import { getUiSettings } from '../kibana_services';

const mockGetUiSettings = getUiSettings as jest.MockedFunction<typeof getUiSettings>;

describe('get_max_bytes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getMaxBytes', () => {
    it('should return parsed bytes from UI settings', () => {
      mockGetUiSettings.mockReturnValue({
        get: jest.fn().mockReturnValue('100MB'),
      } as any);

      const result = getMaxBytes();
      expect(result).toBe(104857600); // 100MB in bytes
    });

    it('should cap at ABSOLUTE_MAX_FILE_SIZE_BYTES when UI setting exceeds limit', () => {
      mockGetUiSettings.mockReturnValue({
        get: jest.fn().mockReturnValue('2GB'),
      } as any);

      const result = getMaxBytes();
      expect(result).toBe(ABSOLUTE_MAX_FILE_SIZE_BYTES);
    });

    it('should handle lowercase file size strings', () => {
      mockGetUiSettings.mockReturnValue({
        get: jest.fn().mockReturnValue('50mb'),
      } as any);

      const result = getMaxBytes();
      expect(result).toBe(52428800); // 50MB in bytes
    });

    it('should return exact value when equal to ABSOLUTE_MAX_FILE_SIZE_BYTES', () => {
      mockGetUiSettings.mockReturnValue({
        get: jest.fn().mockReturnValue('1GB'),
      } as any);

      const result = getMaxBytes();
      // 1GB = 1073741824, but ABSOLUTE_MAX_FILE_SIZE_BYTES is 1073741274
      expect(result).toBe(ABSOLUTE_MAX_FILE_SIZE_BYTES);
    });
  });

  describe('getMaxBytesFormatted', () => {
    it('should return formatted bytes string', () => {
      mockGetUiSettings.mockReturnValue({
        get: jest.fn().mockReturnValue('100MB'),
      } as any);

      const result = getMaxBytesFormatted();
      expect(result).toBe('100 MB');
    });

    it('should format large values correctly', () => {
      mockGetUiSettings.mockReturnValue({
        get: jest.fn().mockReturnValue('500MB'),
      } as any);

      const result = getMaxBytesFormatted();
      expect(result).toBe('500 MB');
    });
  });

  describe('getMaxTikaBytes', () => {
    it('should return MAX_TIKA_FILE_SIZE_BYTES constant', () => {
      const result = getMaxTikaBytes();
      expect(result).toBe(MAX_TIKA_FILE_SIZE_BYTES);
      expect(result).toBe(62914560); // 60MB
    });
  });

  describe('getMaxTikaBytesFormatted', () => {
    it('should return formatted tika max bytes', () => {
      const result = getMaxTikaBytesFormatted();
      expect(result).toBe('60 MB');
    });
  });
});
