/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TemplateListItem as IndexTemplate } from '@kbn/index-management-shared-types';

import {
  hasEmptyWildcards,
  hasInvalidFormat,
  validateStreamName,
  type StreamNameValidator,
} from './validation_utils';

describe('validation_utils', () => {
  describe('hasEmptyWildcards', () => {
    it('returns true when stream name contains wildcard', () => {
      expect(hasEmptyWildcards('logs-*')).toBe(true);
    });

    it('returns true when stream name contains multiple wildcards', () => {
      expect(hasEmptyWildcards('logs-*-*-data')).toBe(true);
    });

    it('returns true when stream name starts with wildcard', () => {
      expect(hasEmptyWildcards('*-logs')).toBe(true);
    });

    it('returns true when stream name ends with wildcard', () => {
      expect(hasEmptyWildcards('logs-*')).toBe(true);
    });

    it('returns true when stream name contains wildcard in middle', () => {
      expect(hasEmptyWildcards('logs-*-data')).toBe(true);
    });

    it('returns false when stream name has no wildcards', () => {
      expect(hasEmptyWildcards('logs-myapp-data')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(hasEmptyWildcards('')).toBe(false);
    });

    it('returns false for stream names with dots and underscores', () => {
      expect(hasEmptyWildcards('logs.apache_access.v2')).toBe(false);
    });
  });

  describe('hasInvalidFormat', () => {
    describe('reserved names', () => {
      it('returns true for "." (dot)', () => {
        expect(hasInvalidFormat('.')).toBe(true);
      });

      it('returns true for ".." (double dot)', () => {
        expect(hasInvalidFormat('..')).toBe(true);
      });
    });

    describe('invalid prefixes', () => {
      it('returns true when stream name starts with "-"', () => {
        expect(hasInvalidFormat('-logs')).toBe(true);
      });

      it('returns true when stream name starts with "_"', () => {
        expect(hasInvalidFormat('_logs')).toBe(true);
      });

      it('returns true when stream name starts with "+"', () => {
        expect(hasInvalidFormat('+logs')).toBe(true);
      });

      it('returns true when stream name starts with ".ds-"', () => {
        expect(hasInvalidFormat('.ds-logs')).toBe(true);
      });

      it('returns false when stream name contains but does not start with invalid prefix', () => {
        expect(hasInvalidFormat('logs-_data')).toBe(false);
        expect(hasInvalidFormat('logs.ds-data')).toBe(false);
      });
    });

    describe('invalid characters', () => {
      it('returns true when stream name contains backslash', () => {
        expect(hasInvalidFormat('logs\\data')).toBe(true);
      });

      it('returns true when stream name contains forward slash', () => {
        expect(hasInvalidFormat('logs/data')).toBe(true);
      });

      it('returns true when stream name contains asterisk', () => {
        expect(hasInvalidFormat('logs*data')).toBe(true);
      });

      it('returns true when stream name contains question mark', () => {
        expect(hasInvalidFormat('logs?data')).toBe(true);
      });

      it('returns true when stream name contains double quote', () => {
        expect(hasInvalidFormat('logs"data')).toBe(true);
      });

      it('returns true when stream name contains less than', () => {
        expect(hasInvalidFormat('logs<data')).toBe(true);
      });

      it('returns true when stream name contains greater than', () => {
        expect(hasInvalidFormat('logs>data')).toBe(true);
      });

      it('returns true when stream name contains pipe', () => {
        expect(hasInvalidFormat('logs|data')).toBe(true);
      });

      it('returns true when stream name contains comma', () => {
        expect(hasInvalidFormat('logs,data')).toBe(true);
      });

      it('returns true when stream name contains hash', () => {
        expect(hasInvalidFormat('logs#data')).toBe(true);
      });

      it('returns true when stream name contains colon', () => {
        expect(hasInvalidFormat('logs:data')).toBe(true);
      });

      it('returns true when stream name contains space', () => {
        expect(hasInvalidFormat('logs data')).toBe(true);
      });

      it('returns true when stream name contains multiple invalid characters', () => {
        expect(hasInvalidFormat('logs*/data#test')).toBe(true);
      });
    });

    describe('valid stream names', () => {
      it('returns false for simple valid name', () => {
        expect(hasInvalidFormat('logs')).toBe(false);
      });

      it('returns false for name with hyphens', () => {
        expect(hasInvalidFormat('logs-myapp-data')).toBe(false);
      });

      it('returns false for name with dots (not at start or reserved)', () => {
        expect(hasInvalidFormat('logs.apache.access')).toBe(false);
      });

      it('returns false for name with underscores (not at start)', () => {
        expect(hasInvalidFormat('logs_myapp_v2')).toBe(false);
      });

      it('returns false for name with numbers', () => {
        expect(hasInvalidFormat('logs-v2-2024')).toBe(false);
      });

      it('returns false for name starting with valid dot prefix', () => {
        expect(hasInvalidFormat('.logs')).toBe(false);
      });

      it('returns false for complex valid name', () => {
        expect(hasInvalidFormat('logs-myapp.apache_access-v2-prod')).toBe(false);
      });

      it('returns false for empty string', () => {
        expect(hasInvalidFormat('')).toBe(false);
      });
    });
  });

  describe('validateStreamName', () => {
    const mockTemplate: IndexTemplate = {
      name: 'test-template',
      indexPatterns: ['logs-*'],
      allowAutoCreate: 'NO_OVERWRITE',
      _kbnMeta: { type: 'default', hasDatastream: true },
      hasSettings: false,
      hasAliases: false,
      hasMappings: false,
    };

    describe('without external validator', () => {
      it('returns empty error when stream name contains wildcards', async () => {
        const result = await validateStreamName('logs-*', mockTemplate);
        expect(result).toEqual({ errorType: 'empty' });
      });

      it('returns invalidFormat error when stream name has invalid format', async () => {
        const result = await validateStreamName('logs data', mockTemplate);
        expect(result).toEqual({
          errorType: 'invalidFormat',
        });
      });

      it('returns invalidFormat error when stream name starts with invalid prefix', async () => {
        const result = await validateStreamName('-logs', mockTemplate);
        expect(result).toEqual({
          errorType: 'invalidFormat',
        });
      });

      it('returns invalidFormat error for reserved name', async () => {
        const result = await validateStreamName('.', mockTemplate);
        expect(result).toEqual({
          errorType: 'invalidFormat',
        });
      });

      it('returns no error for valid stream name', async () => {
        const result = await validateStreamName('logs-myapp-data', mockTemplate);
        expect(result).toEqual({ errorType: null });
      });

      it('checks format before wildcards', async () => {
        // Stream name has both wildcard and invalid format
        const result = await validateStreamName('logs-*-#', mockTemplate);
        // Should return empty error (wildcard check) first
        expect(result).toEqual({ errorType: 'empty' });
      });
    });

    describe('with external validator', () => {
      it('returns duplicate error when validator detects duplicate', async () => {
        const mockValidator: StreamNameValidator = jest.fn().mockResolvedValue({
          errorType: 'duplicate',
        });

        const result = await validateStreamName('logs-myapp', mockTemplate, mockValidator);

        expect(result).toEqual({ errorType: 'duplicate' });
        expect(mockValidator).toHaveBeenCalledWith('logs-myapp', mockTemplate, undefined);
      });

      it('returns higherPriority error with conflicting pattern when validator detects priority conflict', async () => {
        const mockValidator: StreamNameValidator = jest.fn().mockResolvedValue({
          errorType: 'higherPriority',
          conflictingIndexPattern: 'logs-*',
        });

        const result = await validateStreamName('logs-myapp', mockTemplate, mockValidator);

        expect(result).toEqual({
          errorType: 'higherPriority',
          conflictingIndexPattern: 'logs-*',
        });
        expect(mockValidator).toHaveBeenCalledWith('logs-myapp', mockTemplate, undefined);
      });

      it('returns no error when validator passes', async () => {
        const mockValidator: StreamNameValidator = jest.fn().mockResolvedValue({
          errorType: null,
        });

        const result = await validateStreamName('logs-myapp', mockTemplate, mockValidator);

        expect(result).toEqual({ errorType: null });
        expect(mockValidator).toHaveBeenCalledWith('logs-myapp', mockTemplate, undefined);
      });

      it('throws error when validator throws error', async () => {
        const mockValidator: StreamNameValidator = jest
          .fn()
          .mockRejectedValue(new Error('Network error'));

        await expect(validateStreamName('logs-myapp', mockTemplate, mockValidator)).rejects.toThrow(
          'Network error'
        );
        expect(mockValidator).toHaveBeenCalledWith('logs-myapp', mockTemplate, undefined);
      });

      it('passes abort signal to validator', async () => {
        const abortController = new AbortController();
        const mockValidator: StreamNameValidator = jest.fn().mockResolvedValue({
          errorType: null,
        });

        await validateStreamName('logs-myapp', mockTemplate, mockValidator, abortController.signal);

        expect(mockValidator).toHaveBeenCalledWith(
          'logs-myapp',
          mockTemplate,
          abortController.signal
        );
      });

      it('does not call validator when stream name has wildcards', async () => {
        const mockValidator: StreamNameValidator = jest.fn();

        const result = await validateStreamName('logs-*', mockTemplate, mockValidator);

        expect(result).toEqual({ errorType: 'empty' });
        expect(mockValidator).not.toHaveBeenCalled();
      });

      it('does not call validator when stream name has invalid format', async () => {
        const mockValidator: StreamNameValidator = jest.fn();

        const result = await validateStreamName('-logs', mockTemplate, mockValidator);

        expect(result).toEqual({
          errorType: 'invalidFormat',
        });
        expect(mockValidator).not.toHaveBeenCalled();
      });

      it('throws error when validator is aborted', async () => {
        const abortController = new AbortController();
        const mockValidator: StreamNameValidator = jest
          .fn()
          .mockImplementation(async (_, __, signal) => {
            // Check if already aborted
            if (signal?.aborted) {
              throw new Error('Aborted');
            }
            return new Promise((_resolve, reject) => {
              signal?.addEventListener('abort', () => {
                reject(new Error('Aborted'));
              });
            });
          });

        // Abort immediately
        abortController.abort();

        await expect(
          validateStreamName('logs-myapp', mockTemplate, mockValidator, abortController.signal)
        ).rejects.toThrow('Aborted');
      });
    });

    describe('validation order', () => {
      it('validates in correct order: wildcards -> format -> external validator', async () => {
        const validationOrder: string[] = [];
        const mockValidator: StreamNameValidator = jest.fn().mockImplementation(async () => {
          validationOrder.push('external');
          return { errorType: null };
        });

        // Valid stream name that passes all checks
        await validateStreamName('logs-myapp', mockTemplate, mockValidator);
        expect(validationOrder).toEqual(['external']);

        validationOrder.length = 0;

        // Stream name with wildcard - should not reach external validator
        await validateStreamName('logs-*', mockTemplate, mockValidator);
        expect(validationOrder).toEqual([]);

        validationOrder.length = 0;

        // Stream name with invalid format - should not reach external validator
        await validateStreamName('-logs', mockTemplate, mockValidator);
        expect(validationOrder).toEqual([]);
      });
    });

    describe('edge cases', () => {
      it('handles empty string', async () => {
        const result = await validateStreamName('', mockTemplate);
        expect(result).toEqual({ errorType: 'empty' });
      });

      it('handles very long valid stream name', async () => {
        const longName = 'logs-' + 'a'.repeat(250);
        const result = await validateStreamName(longName, mockTemplate);
        expect(result).toEqual({ errorType: null });
      });
    });
  });
});
