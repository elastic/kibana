/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ZodIssueWithPath, SubmittedPipeline } from './format_zod_errors';
import { formatZodPipelineErrors } from './format_zod_errors';

describe('formatZodPipelineErrors', () => {
  describe('union discriminator filtering', () => {
    it('keeps union discriminator errors for actions in the pipeline', () => {
      const issues: ZodIssueWithPath[] = [
        {
          message: 'Invalid grok configuration',
          path: ['steps', 0, 'action'],
        },
      ];
      const submittedPipeline: SubmittedPipeline = {
        steps: [{ action: 'grok' }],
      };

      const result = formatZodPipelineErrors(issues, submittedPipeline);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(issues[0]);
    });

    it('filters out union discriminator errors for actions NOT in the pipeline', () => {
      const issues: ZodIssueWithPath[] = [
        {
          message: 'Invalid date processor configuration',
          path: ['steps', 0, 'action'],
        },
      ];
      const submittedPipeline: SubmittedPipeline = {
        steps: [{ action: 'grok' }],
      };

      const result = formatZodPipelineErrors(issues, submittedPipeline);

      expect(result).toHaveLength(0);
    });

    it('handles case-insensitive matching for action names', () => {
      const issues: ZodIssueWithPath[] = [
        {
          message: 'Invalid GROK pattern',
          path: ['steps', 0, 'action'],
        },
      ];
      const submittedPipeline: SubmittedPipeline = {
        steps: [{ action: 'grok' }],
      };

      const result = formatZodPipelineErrors(issues, submittedPipeline);

      expect(result).toHaveLength(1);
    });

    it('handles multiple union discriminator errors for different steps', () => {
      const issues: ZodIssueWithPath[] = [
        {
          message: 'Invalid grok configuration',
          path: ['steps', 0, 'action'],
        },
        {
          message: 'Invalid date processor configuration',
          path: ['steps', 1, 'action'],
        },
      ];
      const submittedPipeline: SubmittedPipeline = {
        steps: [{ action: 'grok' }, { action: 'date' }],
      };

      const result = formatZodPipelineErrors(issues, submittedPipeline);

      expect(result).toHaveLength(2);
      expect(result).toEqual(issues);
    });

    it('filters out union discriminator error when message mentions different action than step uses', () => {
      const issues: ZodIssueWithPath[] = [
        {
          message: 'Invalid geoip processor expected',
          path: ['steps', 0, 'action'],
        },
      ];
      const submittedPipeline: SubmittedPipeline = {
        steps: [{ action: 'grok' }],
      };

      const result = formatZodPipelineErrors(issues, submittedPipeline);

      expect(result).toHaveLength(0);
    });
  });

  describe('step-specific field errors', () => {
    it('keeps field errors for steps with actions in the pipeline', () => {
      const issues: ZodIssueWithPath[] = [
        {
          message: 'pattern is required',
          path: ['steps', 0, 'pattern'],
        },
      ];
      const submittedPipeline: SubmittedPipeline = {
        steps: [{ action: 'grok' }],
      };

      const result = formatZodPipelineErrors(issues, submittedPipeline);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(issues[0]);
    });

    it('keeps field errors when action cannot be determined (defensive)', () => {
      const issues: ZodIssueWithPath[] = [
        {
          message: 'some field error',
          path: ['steps', 0, 'unknownField'],
        },
      ];
      const submittedPipeline: SubmittedPipeline = {
        steps: [{}],
      };

      const result = formatZodPipelineErrors(issues, submittedPipeline);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(issues[0]);
    });

    it('handles step index out of bounds gracefully', () => {
      const issues: ZodIssueWithPath[] = [
        {
          message: 'some error',
          path: ['steps', 5, 'field'],
        },
      ];
      const submittedPipeline: SubmittedPipeline = {
        steps: [{ action: 'grok' }],
      };

      const result = formatZodPipelineErrors(issues, submittedPipeline);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(issues[0]);
    });
  });
});
