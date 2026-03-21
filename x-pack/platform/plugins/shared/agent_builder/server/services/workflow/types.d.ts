import type { WorkflowExecutionState } from '@kbn/agent-builder-genai-utils/tools/utils/workflows';
export type WorkflowExecutionResult = {
    success: true;
    execution: WorkflowExecutionState;
} | {
    success: false;
    error: string;
};
