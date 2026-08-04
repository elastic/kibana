import type { InlineWorkflowActionDraft } from '../types';
export declare class InvalidInlineWorkflowError extends Error {
    constructor(message: string);
}
export declare const stepTypeFromConnectorType: (connectorTypeId: string, subAction?: string) => string;
export declare const buildInlineWorkflowYaml: (action: InlineWorkflowActionDraft) => string;
