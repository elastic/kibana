import type { WorkflowStepExecutionDto } from '@kbn/workflows/types/v1';
import type { JsonValue } from '@kbn/utility-types';
/**
 * Recursively extracts the output from a workflow execution's step executions.
 * At top-level (scopeDepth=0), finds the last step. At nested levels (scopeDepth>0),
 * considers all steps at that level. If steps have children, recurses into them.
 * Otherwise, returns their output(s).
 */
export declare const getWorkflowOutput: (stepExecutions: WorkflowStepExecutionDto[]) => JsonValue;
