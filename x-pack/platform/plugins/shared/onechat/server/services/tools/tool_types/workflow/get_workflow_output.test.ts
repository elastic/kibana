/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getWorkflowOutput } from './get_workflow_output';
import type { WorkflowStepExecutionDto } from '@kbn/workflows/types/v1';
import { ExecutionStatus } from '@kbn/workflows/types/v1';

describe('getWorkflowOutput', () => {
  describe('simple workflows', () => {
    it('should return null for empty step executions', () => {
      const result = getWorkflowOutput([]);
      expect(result).toBeNull();
    });

    it('should return output from the last top-level step', () => {
      const steps: WorkflowStepExecutionDto[] = [
        createStep('step1', { result: 'first' }),
        createStep('step2', { result: 'second' }),
        createStep('step3', { result: 'third' }),
      ];

      const result = getWorkflowOutput(steps);
      expect(result).toEqual({ result: 'third' });
    });

    it('should handle undefined output gracefully', () => {
      const steps: WorkflowStepExecutionDto[] = [
        createStep('step1', { result: 'first' }),
        createStep('step2', undefined),
      ];

      const result = getWorkflowOutput(steps);
      expect(result).toBeNull();
    });

    it('should handle non-empty initial stack', () => {
      const steps: WorkflowStepExecutionDto[] = [
        createStep('step1', { result: 'first' }, [{ stepId: 'top-wrapper' }]),
        createStep('step2', { result: 'second' }, [{ stepId: 'top-wrapper' }]),
        createStep('step3', { result: 'third' }, [{ stepId: 'top-wrapper' }]),
      ];

      const result = getWorkflowOutput(steps);
      expect(result).toEqual({ result: 'third' });
    });
  });

  describe('foreach loops', () => {
    it('should aggregate outputs from all iterations of a foreach loop', () => {
      const steps: WorkflowStepExecutionDto[] = [
        // Top-level step
        createStep('process-messages', null),
        // Foreach iterations
        createStep('process-item', { title: 'Result 1' }, [{ stepId: 'process-messages' }]),
        createStep('process-item', { title: 'Result 2' }, [{ stepId: 'process-messages' }]),
        createStep('process-item', { title: 'Result 3' }, [{ stepId: 'process-messages' }]),
      ];

      const result = getWorkflowOutput(steps);
      expect(result).toEqual([{ title: 'Result 1' }, { title: 'Result 2' }, { title: 'Result 3' }]);
    });

    it('should filter out undefined outputs in foreach iterations', () => {
      const steps: WorkflowStepExecutionDto[] = [
        createStep('process-messages', null),
        createStep('process-item', { title: 'Result 1' }, [{ stepId: 'process-messages' }]),
        createStep('process-item', undefined, [{ stepId: 'process-messages' }]),
        createStep('process-item', { title: 'Result 3' }, [{ stepId: 'process-messages' }]),
      ];

      const result = getWorkflowOutput(steps);
      expect(result).toEqual([{ title: 'Result 1' }, { title: 'Result 3' }]);
    });

    it('should only consider the last top-level step when multiple steps exist', () => {
      const steps: WorkflowStepExecutionDto[] = [
        // First top-level step with children
        createStep('first-step', null),
        createStep('first-child', { result: 'ignored' }, [{ stepId: 'first-step' }]),
        // Second top-level step with children (this should be used)
        createStep('second-step', null),
        createStep('second-child', { result: 'used-1' }, [{ stepId: 'second-step' }]),
        createStep('second-child', { result: 'used-2' }, [{ stepId: 'second-step' }]),
      ];

      const result = getWorkflowOutput(steps);
      expect(result).toEqual([{ result: 'used-1' }, { result: 'used-2' }]);
    });
  });

  describe('nested foreach loops', () => {
    it('should handle nested foreach loops and aggregate all leaf outputs', () => {
      const steps: WorkflowStepExecutionDto[] = [
        // Top-level step
        createStep('outer-loop', null),
        // Outer loop iterations
        createStep('inner-loop', null, [{ stepId: 'outer-loop' }]),
        createStep('leaf', { value: 'A1' }, [{ stepId: 'outer-loop' }, { stepId: 'inner-loop' }]),
        createStep('leaf', { value: 'A2' }, [{ stepId: 'outer-loop' }, { stepId: 'inner-loop' }]),
        // Second outer loop iteration
        createStep('inner-loop', null, [{ stepId: 'outer-loop' }]),
        createStep('leaf', { value: 'B1' }, [{ stepId: 'outer-loop' }, { stepId: 'inner-loop' }]),
        createStep('leaf', { value: 'B2' }, [{ stepId: 'outer-loop' }, { stepId: 'inner-loop' }]),
      ];

      const result = getWorkflowOutput(steps);
      expect(result).toEqual([{ value: 'A1' }, { value: 'A2' }, { value: 'B1' }, { value: 'B2' }]);
    });

    it('should handle deeply nested structures', () => {
      const steps: WorkflowStepExecutionDto[] = [
        createStep('level0', null),
        createStep('level1', null, [{ stepId: 'level0' }]),
        createStep('level2', null, [{ stepId: 'level0' }, { stepId: 'level1' }]),
        createStep('level3', { final: 'result' }, [
          { stepId: 'level0' },
          { stepId: 'level1' },
          { stepId: 'level2' },
        ]),
      ];

      const result = getWorkflowOutput(steps);
      expect(result).toEqual([{ final: 'result' }]);
    });
  });

  describe('mixed scenarios', () => {
    it('should handle workflow with some steps having children and some not', () => {
      const steps: WorkflowStepExecutionDto[] = [
        createStep('first-step', { result: 'direct' }),
        createStep('second-step', null),
        createStep('child', { result: 'from-child' }, [{ stepId: 'second-step' }]),
      ];

      const result = getWorkflowOutput(steps);
      expect(result).toEqual([{ result: 'from-child' }]);
    });

    it('should return null when last step has children with no outputs', () => {
      const steps: WorkflowStepExecutionDto[] = [
        createStep('parent', null),
        createStep('child', undefined, [{ stepId: 'parent' }]),
      ];

      const result = getWorkflowOutput(steps);
      expect(result).toBeNull();
    });
  });
});

// Helper function to create a mock step execution
function createStep(
  stepId: string,
  output: any,
  scopeStack: Array<{ stepId: string }> = []
): WorkflowStepExecutionDto {
  return {
    id: `${stepId}-${Date.now()}-${Math.random()}`,
    stepId,
    workflowRunId: 'test-run',
    workflowId: 'test-workflow',
    status: ExecutionStatus.COMPLETED,
    startedAt: new Date().toISOString(),
    scopeStack: scopeStack.map((frame, index) => ({
      stepId: frame.stepId,
      nodeId: `node-${index}`,
      nodeType: 'foreach',
      nestedScopes: [],
    })),
    topologicalIndex: 0,
    globalExecutionIndex: 0,
    stepExecutionIndex: 0,
    output,
  };
}
