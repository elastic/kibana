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
    readonly executeWorkflow: "platform.core.execute_workflow";
    readonly createVisualization: "platform.core.create_visualization";
    readonly getWorkflowExecutionStatus: "platform.core.get_workflow_execution_status";
    readonly resumeWorkflowExecution: "platform.core.resume_workflow_execution";
    readonly listWorkflowExecutions: "platform.core.list_workflow_executions";
    readonly productDocumentation: "platform.core.product_documentation";
    readonly cases: "platform.core.cases";
    readonly integrationKnowledge: "platform.core.integration_knowledge";
    readonly smlSearch: "platform.core.sml_search";
    readonly smlAttach: "platform.core.sml_attach";
    readonly executeConnectorSubAction: "platform.core.execute_connector_sub_action";
};
/**
 * Ids of built-in Cases cluster tools, registered by the Cases plugin.
 * All live under `platform.core.cases.*`.
 * The read/search tool uses `platformCoreTools.cases` (`platform.core.cases`).
 */
export declare const platformCoreCasesTools: {
    readonly manage: "platform.core.cases.manage";
    readonly attachments: "platform.core.cases.attachments";
    readonly observables: "platform.core.cases.observables";
};
/**
 * Sig Events tools should try to follow this naming convention when possible:
 * {namespace}.sig_events.{feature}_{entity}_{action}
 *
 * - {feature} refers to a high-level scope within Sig Events, for example KIs.
 * - {entity} is a more granular entity withing the {feature} scope, for example Feature KI or Query KI.
 * - {action} the action to perform on the entity
 */
export declare const platformSignificantEventsTools: {
    readonly searchKnowledgeIndicators: "platform.sig_events.ki_search";
    readonly createFeatureKnowledgeIndicator: "platform.sig_events.ki_feature_create";
    readonly createQueryKnowledgeIndicator: "platform.sig_events.ki_query_create";
    readonly searchEvent: "platform.sig_events.event_search";
    readonly createEvent: "platform.sig_events.event_create";
    readonly updateEventStatus: "platform.sig_events.event_status_update";
    readonly discoveryWrite: "platform.sig_events.discovery_write";
    readonly eventsWrite: "platform.sig_events.events_write";
    readonly attachInvestigation: "platform.streams.sig_events.event_investigation_attach";
    readonly reportInvestigationProgress: "platform.streams.investigation_progress_report";
};
export declare const attachmentTools: {
    read: string;
    update: string;
    add: string;
    list: string;
    diff: string;
};
export declare const internalTools: {
    runSubagent: string;
    sleep: string;
    writeTodos: string;
    loadSkill: string;
    askUserQuestion: string;
    readFile: string;
    listFiles: string;
    bash: string;
};
export declare const isAttachmentTool: (toolName: string) => boolean;
export declare const isInternalTool: (toolName: string) => boolean;
export declare const isExcludedFromFilestore: (toolName: string) => boolean;
/**
 * List of tool types which can be created / edited by a user.
 */
export declare const editableToolTypes: ToolType[];
export declare const defaultAgentToolIds: ("platform.core.search" | "platform.core.list_indices" | "platform.core.get_index_mapping" | "platform.core.get_document_by_id" | "platform.core.generate_esql" | "platform.core.generate_workflow" | "platform.core.execute_esql" | "platform.core.execute_workflow" | "platform.core.get_workflow_execution_status" | "platform.core.resume_workflow_execution" | "platform.core.list_workflow_executions" | "platform.core.sml_search" | "platform.core.sml_attach" | "platform.core.execute_connector_sub_action")[];
/**
 * The number of active tools that will trigger a warning in the UI.
 * Agent will perform poorly if it has too many tools.
 */
export declare const activeToolsCountWarningThreshold = 24;
