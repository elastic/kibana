export type InlineActionStepType = 'slack2.sendMessage' | 'email';
export type ActionSource = 'existing' | 'inline';
export interface ExistingWorkflowActionDraft {
    id: string;
    source: 'existing';
    workflowId: string | null;
}
export interface InlineWorkflowActionDraft {
    id: string;
    source: 'inline';
    stepType: InlineActionStepType;
    connectorId: string | null;
    params: string;
}
export type ActionDraft = ExistingWorkflowActionDraft | InlineWorkflowActionDraft;
export type ActionTemplate = {
    source: 'existing';
} | {
    source: 'inline';
    stepType: InlineActionStepType;
};
export declare const getActionTemplateKey: (template: ActionTemplate) => string;
export type ActionFormValue = ActionDraft[];
export declare const isActionValid: (action: ActionDraft) => boolean;
