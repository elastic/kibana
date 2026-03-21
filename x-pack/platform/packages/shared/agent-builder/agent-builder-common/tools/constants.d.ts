import { ToolType } from './definition';
/**
 * Ids of built-in agentBuilder tools
 */
export declare const platformCoreTools: {
    readonly indexExplorer: "platform.core.index_explorer";
    readonly search: "platform.core.search";
    readonly listIndices: "platform.core.list_indices";
    readonly getIndexMapping: "platform.core.get_index_mapping";
    readonly getDocumentById: "platform.core.get_document_by_id";
    readonly generateEsql: "platform.core.generate_esql";
    readonly executeEsql: "platform.core.execute_esql";
    readonly createVisualization: "platform.core.create_visualization";
    readonly getWorkflowExecutionStatus: "platform.core.get_workflow_execution_status";
    readonly productDocumentation: "platform.core.product_documentation";
    readonly cases: "platform.core.cases";
    readonly integrationKnowledge: "platform.core.integration_knowledge";
    readonly smlSearch: "platform.core.sml_search";
    readonly smlAttach: "platform.core.sml_attach";
};
export declare const platformStreamsSigEventsTools: {
    readonly searchKnowledgeIndicators: "platform.streams.sig_events.search_knowledge_indicators";
};
export declare const attachmentTools: {
    read: string;
    update: string;
    add: string;
    list: string;
    diff: string;
};
export declare const filestoreTools: {
    read: string;
    ls: string;
    grep: string;
    glob: string;
};
export declare const isAttachmentTool: (toolName: string) => boolean;
export declare const isFilestoreTool: (toolName: string) => boolean;
export declare const isInternalTool: (toolName: string) => boolean;
export declare const isExcludedFromFilestore: (toolName: string) => boolean;
/**
 * List of tool types which can be created / edited by a user.
 */
export declare const editableToolTypes: ToolType[];
export declare const defaultAgentToolIds: ("platform.core.search" | "platform.core.list_indices" | "platform.core.get_index_mapping" | "platform.core.get_document_by_id" | "platform.core.get_workflow_execution_status" | "platform.core.sml_search" | "platform.core.sml_attach")[];
/**
 * The number of active tools that will trigger a warning in the UI.
 * Agent will perform poorly if it has too many tools.
 */
export declare const activeToolsCountWarningThreshold = 24;
