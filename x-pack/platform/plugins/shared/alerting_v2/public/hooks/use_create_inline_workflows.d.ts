import { type InlineWorkflowActionDraft } from '@kbn/alerting-v2-rule-form';
/**
 * Creates single-step workflows for the provided inline action drafts and
 * returns their ids. Used by the action policy form to turn "simple workflow"
 * drafts into real workflows that can be referenced as destinations.
 *
 * `createInlineWorkflows` is self-cleaning: if creation of any draft fails, the
 * workflows created so far are rolled back before the error is re-thrown.
 * `rollbackWorkflows` is exposed separately for callers that need to undo the
 * created workflows when a later step (e.g. the action policy request) fails.
 */
export declare const useCreateInlineWorkflows: () => {
    createInlineWorkflows: (drafts: InlineWorkflowActionDraft[]) => Promise<string[]>;
    rollbackWorkflows: (ids: string[]) => Promise<void>;
};
