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
    readonly generateWorkflow: "platform.core.generate_workflow";
    readonly executeEsql: "platform.core.execute_esql";
    readonly createVisualization: "platform.core.create_visualization";
    readonly getWorkflowExecutionStatus: "platform.core.get_workflow_execution_status";
    readonly resumeWorkflowExecution: "platform.core.resume_workflow_execution";
    readonly productDocumentation: "platform.core.product_documentation";
    readonly cases: "platform.core.cases";
    readonly integrationKnowledge: "platform.core.integration_knowledge";
    readonly smlSearch: "platform.core.sml_search";
    readonly smlAttach: "platform.core.sml_attach";
    readonly executeConnectorSubAction: "platform.core.execute_connector_sub_action";
};
/**
 * Sig Events tools should try to follow this naming convention when possible:
 * {namespace}.sig_events.{feature}_{entity}_{action}
 *
 * - {feature} refers to a high-level scope within Sig Events, for example KIs.
 * - {entity} is a more granular entity withing the {feature} scope, for example Feature KI or Query KI.
 * - {action} the action to perform on the entity
 */
export declare const platformStreamsSigEventsTools: {
    readonly searchKnowledgeIndicators: "platform.streams.sig_events.ki_search";
    readonly createFeatureKnowledgeIndicator: "platform.streams.sig_events.ki_feature_create";
    readonly createQueryKnowledgeIndicator: "platform.streams.sig_events.ki_query_create";
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
export declare const internalTools: {
    subAgentTool: string;
    sleepTool: string;
    writeTodosTool: string;
};
export declare const isAttachmentTool: (toolName: string) => boolean;
export declare const isFilestoreTool: (toolName: string) => boolean;
export declare const isInternalTool: (toolName: string) => boolean;
export declare const isExcludedFromFilestore: (toolName: string) => boolean;
/**
 * List of tool types which can be created / edited by a user.
 */
export declare const editableToolTypes: ToolType[];
export declare const defaultAgentToolIds: ("platform.core.search" | "platform.core.list_indices" | "platform.core.get_index_mapping" | "platform.core.get_document_by_id" | "platform.core.get_workflow_execution_status" | "platform.core.resume_workflow_execution" | "platform.core.sml_search" | "platform.core.sml_attach" | "platform.core.execute_connector_sub_action")[];
/**
 * The number of active tools that will trigger a warning in the UI.
 * Agent will perform poorly if it has too many tools.
 */
export declare const activeToolsCountWarningThreshold = 24;
