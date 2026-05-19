import type { EsqlPrompts } from '../doc_base/load_data';
export declare const requestDocumentationSystemPrompt: ({ esqlPrompts }: {
    esqlPrompts: EsqlPrompts;
}) => string;
export declare const generateEsqlPrompt: ({ esqlPrompts, additionalSystemInstructions, availableTools, hasTools, }: {
    esqlPrompts: EsqlPrompts;
    additionalSystemInstructions?: string;
    availableTools: string[];
    hasTools?: boolean;
}) => string;
