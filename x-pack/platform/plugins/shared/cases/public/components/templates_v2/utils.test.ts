/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { getStepStatus, checkTemplateExists } from './utils';
import { getTemplate } from './api/api';

vi.mock('./api/api');

describe('utils', () => {
  describe('getStepStatus', () => {
    it('returns "current" when step equals currentStep', () => {
      expect(getStepStatus(1, 1)).toBe('current');
    });

    it('returns "complete" when step is less than currentStep', () => {
      expect(getStepStatus(1, 2)).toBe('complete');
    });

    it('returns "incomplete" when step is greater than currentStep', () => {
      expect(getStepStatus(3, 1)).toBe('incomplete');
    });
  });

  describe('checkTemplateExists', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('returns true when getTemplate resolves', async () => {
      (getTemplate as Mock).mockResolvedValue({ templateId: 'test-id' });

      const result = await checkTemplateExists('test-id');

      expect(result).toBe(true);
      expect(getTemplate).toHaveBeenCalledWith({ templateId: 'test-id' });
    });

    it('returns false when getTemplate rejects', async () => {
      (getTemplate as Mock).mockRejectedValue(new Error('Not found'));

      const result = await checkTemplateExists('missing-id');

      expect(result).toBe(false);
    });
  });
});
