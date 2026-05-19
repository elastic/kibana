import type { CasesFeaturesAllRequired } from '../ui/types';
export * from './owners';
export * from './files';
export * from './application';
export * from './observables';
export * from './attachments';
/**
 * Cases connector limits.
 */
export declare const MAX_OPEN_CASES_DEFAULT_MAXIMUM = 20;
export declare const ABSOLUTE_MAX_CASES_PER_RUN = 1000;
export declare const DEFAULT_MAX_OPEN_CASES = 5;
export declare const MAX_OPEN_CASES_ADVANCED_SETTING: "cases:maxOpenCasesPerRuleRun";
export declare const getMaximumOpenCases: (maxOpenCases?: number | null) => number;
export declare const DEFAULT_DATE_FORMAT: "dateFormat";
export declare const DEFAULT_DATE_FORMAT_TZ: "dateFormat:tz";
/**
 * Saved objects
 */
export declare const CASE_SAVED_OBJECT: "cases";
export declare const CASE_CONNECTOR_MAPPINGS_SAVED_OBJECT: "cases-connector-mappings";
export declare const CASE_USER_ACTION_SAVED_OBJECT: "cases-user-actions";
export declare const CASE_COMMENT_SAVED_OBJECT: "cases-comments";
export declare const CASE_ATTACHMENT_SAVED_OBJECT: "cases-attachments";
export declare const CASE_CONFIGURE_SAVED_OBJECT: "cases-configure";
export declare const CASE_RULES_SAVED_OBJECT: "cases-rules";
export declare const CASE_ID_INCREMENTER_SAVED_OBJECT: "cases-incrementing-id";
export declare const CASE_TEMPLATE_SAVED_OBJECT: "cases-templates";
export declare const CASE_FIELD_DEFINITION_SAVED_OBJECT: "cases-field-definition";
/**
 * If more values are added here please also add them here: x-pack/test/cases_api_integration/common/plugins
 */
export declare const SAVED_OBJECT_TYPES: ("cases" | "cases-comments" | "cases-configure" | "cases-connector-mappings" | "cases-user-actions" | "cases-templates")[];
/**
 * Case routes
 */
export declare const CASES_URL: "/api/cases";
export declare const CASE_FIND_URL: "/api/cases/_find";
export declare const CASE_DETAILS_URL: "/api/cases/{case_id}";
export declare const CASE_CONFIGURE_URL: "/api/cases/configure";
export declare const CASE_CONFIGURE_DETAILS_URL: "/api/cases/configure/{configuration_id}";
export declare const CASE_CONFIGURE_CONNECTORS_URL: "/api/cases/configure/connectors";
export declare const CASE_COMMENTS_URL: "/api/cases/{case_id}/comments";
export declare const CASE_FIND_ATTACHMENTS_URL: "/api/cases/{case_id}/comments/_find";
export declare const CASE_COMMENT_DETAILS_URL: "/api/cases/{case_id}/comments/{comment_id}";
export declare const CASE_COMMENT_DELETE_URL: "/api/cases/{case_id}/comments/{comment_id}";
export declare const CASE_PUSH_URL: "/api/cases/{case_id}/connector/{connector_id}/_push";
export declare const CASE_REPORTERS_URL: "/api/cases/reporters";
export declare const CASE_TAGS_URL: "/api/cases/tags";
export declare const CASE_USER_ACTIONS_URL: "/api/cases/{case_id}/user_actions";
export declare const CASE_FIND_USER_ACTIONS_URL: "/api/cases/{case_id}/user_actions/_find";
export declare const CASE_ALERTS_URL: "/api/cases/alerts/{alert_id}";
export declare const CASE_DETAILS_ALERTS_URL: "/api/cases/{case_id}/alerts";
export declare const CASE_FILES_URL: "/api/cases/{case_id}/files";
/**
 * Internal routes
 */
export declare const CASES_INTERNAL_URL: "/internal/cases";
export declare const INTERNAL_BULK_CREATE_ATTACHMENTS_URL: "/internal/cases/{case_id}/attachments/_bulk_create";
export declare const INTERNAL_BULK_GET_ATTACHMENTS_URL: "/internal/cases/{case_id}/attachments/_bulk_get";
export declare const INTERNAL_SUGGEST_USER_PROFILES_URL: "/internal/cases/_suggest_user_profiles";
export declare const INTERNAL_CONNECTORS_URL: "/internal/cases/{case_id}/_connectors";
export declare const INTERNAL_BULK_GET_CASES_URL: "/internal/cases/_bulk_get";
export declare const INTERNAL_GET_CASE_USER_ACTIONS_STATS_URL: "/internal/cases/{case_id}/user_actions/_stats";
export declare const INTERNAL_CASE_USERS_URL: "/internal/cases/{case_id}/_users";
export declare const INTERNAL_DELETE_FILE_ATTACHMENTS_URL: "/internal/cases/{case_id}/attachments/files/_bulk_delete";
export declare const INTERNAL_GET_CASE_CATEGORIES_URL: "/internal/cases/categories";
export declare const INTERNAL_CASE_METRICS_URL: "/internal/cases/metrics";
export declare const INTERNAL_CASE_METRICS_DETAILS_URL: "/internal/cases/metrics/{case_id}";
export declare const INTERNAL_CASE_SIMILAR_CASES_URL: "/internal/cases/{case_id}/_similar";
export declare const INTERNAL_PUT_CUSTOM_FIELDS_URL: string;
export declare const INTERNAL_CASE_OBSERVABLES_URL: "/internal/cases/{case_id}/observables";
export declare const INTERNAL_CASE_OBSERVABLES_PATCH_URL: "/internal/cases/{case_id}/observables/{observable_id}";
export declare const INTERNAL_CASE_OBSERVABLES_DELETE_URL: "/internal/cases/{case_id}/observables/{observable_id}";
export declare const INTERNAL_CASE_FIND_USER_ACTIONS_URL: "/internal/cases/{case_id}/user_actions/_find";
export declare const INTERNAL_CASE_GET_CASES_BY_ATTACHMENT_URL: "/internal/cases/case/attachments/_find_containing_all";
export declare const INTERNAL_BULK_CREATE_CASE_OBSERVABLES_URL: string;
export declare const INTERNAL_TEMPLATES_URL: "/internal/cases/templates";
export declare const INTERNAL_TEMPLATE_DETAILS_URL: "/internal/cases/templates/{template_id}";
export declare const INTERNAL_BULK_DELETE_TEMPLATES_URL: "/internal/cases/templates/_bulk_delete";
export declare const INTERNAL_BULK_EXPORT_TEMPLATES_URL: "/internal/cases/templates/_bulk_export";
export declare const INTERNAL_TEMPLATE_TAGS_URL: "/internal/cases/templates/tags";
export declare const INTERNAL_TEMPLATE_CREATORS_URL: "/internal/cases/templates/creators";
export declare const INTERNAL_FIELD_DEFINITIONS_URL: "/internal/cases/field_definitions";
export declare const INTERNAL_FIELD_DEFINITION_DETAILS_URL: "/internal/cases/field_definitions/{field_definition_id}";
/**
 * Action routes
 */
export declare const ACTION_URL: "/api/actions";
export declare const ACTION_TYPES_URL: "/api/actions/connector_types";
export declare const CONNECTORS_URL: "/api/actions/connectors";
/**
 * Alerts
 */
export declare const MAX_ALERTS_PER_CASE: 1000;
/**
 * Searching
 */
export declare const MAX_DOCS_PER_PAGE: 10000;
export declare const MAX_BULK_GET_ATTACHMENTS: 100;
export declare const MAX_CONCURRENT_SEARCHES: 10;
export declare const MAX_BULK_GET_CASES: 1000;
export declare const MAX_COMMENTS_PER_PAGE: 100;
export declare const MAX_CASES_PER_PAGE: 100;
export declare const MAX_USER_ACTIONS_PER_PAGE: 100;
export declare const MAX_CATEGORY_FILTER_LENGTH: 100;
export declare const MAX_TAGS_FILTER_LENGTH: 100;
export declare const MAX_ASSIGNEES_FILTER_LENGTH: 100;
export declare const MAX_REPORTERS_FILTER_LENGTH: 100;
export declare const MAX_SUPPORTED_CONNECTORS_RETURNED: 1000;
/**
 * Validation
 */
export declare const MAX_TITLE_LENGTH: 160;
export declare const MAX_RULE_NAME_LENGTH: 100;
export declare const MAX_SUFFIX_LENGTH: 60;
export declare const MAX_CATEGORY_LENGTH: 50;
export declare const MAX_DESCRIPTION_LENGTH: 30000;
export declare const MAX_COMMENT_LENGTH: 30000;
export declare const MAX_LENGTH_PER_TAG: 256;
export declare const MAX_TAGS_PER_CASE: 200;
export declare const MAX_DELETE_IDS_LENGTH: 100;
export declare const MAX_SUGGESTED_PROFILES: 10;
export declare const MAX_CASES_TO_UPDATE: 100;
export declare const MAX_BULK_CREATE_ATTACHMENTS: 100;
export declare const MAX_USER_ACTIONS_PER_CASE: 10000;
export declare const MAX_PERSISTABLE_STATE_AND_EXTERNAL_REFERENCES: 100;
export declare const MAX_CUSTOM_FIELDS_PER_CASE: 10;
export declare const MAX_CUSTOM_FIELD_KEY_LENGTH: 36;
export declare const MAX_CUSTOM_FIELD_LABEL_LENGTH: 50;
export declare const MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH: 160;
export declare const MAX_TEMPLATE_KEY_LENGTH: 36;
export declare const MAX_TEMPLATE_NAME_LENGTH: 50;
export declare const MAX_TEMPLATE_DESCRIPTION_LENGTH: 1000;
export declare const MAX_TEMPLATES_LENGTH: 10;
export declare const MAX_TEMPLATE_TAG_LENGTH: 50;
export declare const MAX_TAGS_PER_TEMPLATE: 10;
export declare const MAX_FIELD_DEFINITIONS_PER_OWNER: 200;
export declare const MAX_FILENAME_LENGTH: 160;
export declare const MAX_CUSTOM_OBSERVABLE_TYPES_LABEL_LENGTH: 50;
/**
 * Cases features
 */
export declare const DEFAULT_FEATURES: CasesFeaturesAllRequired;
/**
 * Task manager
 */
export declare const CASES_TELEMETRY_TASK_NAME = "cases-telemetry-task";
export declare const ANALYTICS_BACKFILL_TASK_TYPE = "cai:cases_analytics_index_backfill";
export declare const ANALYTICS_SCHEDULER_TASK_TYPE = "cai:cases_analytics_index_scheduler";
export declare const ANALYTICS_SYNCHRONIZATION_TASK_TYPE = "cai:cases_analytics_index_synchronization";
/**
 * Telemetry
 */
export declare const CASE_TELEMETRY_SAVED_OBJECT = "cases-telemetry";
export declare const CASE_TELEMETRY_SAVED_OBJECT_ID = "cases-telemetry";
/**
 * Cases UI Capabilities
 */
export declare const CREATE_CASES_CAPABILITY: "create_cases";
export declare const READ_CASES_CAPABILITY: "read_cases";
export declare const UPDATE_CASES_CAPABILITY: "update_cases";
export declare const DELETE_CASES_CAPABILITY: "delete_cases";
export declare const PUSH_CASES_CAPABILITY: "push_cases";
export declare const CASES_SETTINGS_CAPABILITY: "cases_settings";
export declare const CASES_CONNECTORS_CAPABILITY: "cases_connectors";
export declare const CASES_REOPEN_CAPABILITY: "case_reopen";
export declare const CREATE_COMMENT_CAPABILITY: "create_comment";
export declare const ASSIGN_CASE_CAPABILITY: "cases_assign";
export declare const MANAGE_TEMPLATES_CAPABILITY: "cases_manage_templates";
/**
 * Cases API Tags
 */
/**
 * This tag registered for the cases suggest user profiles API
 */
export declare const SUGGEST_USER_PROFILES_API_TAG = "casesSuggestUserProfiles";
/**
 * This tag is registered for the security bulk get API
 */
export declare const BULK_GET_USER_PROFILES_API_TAG = "bulkGetUserProfiles";
/**
 * This tag is registered for the connectors (configure) get API
 */
export declare const GET_CONNECTORS_CONFIGURE_API_TAG = "casesGetConnectorsConfigure";
/**
 * User profiles
 */
export declare const DEFAULT_USER_SIZE = 10;
export declare const MAX_ASSIGNEES_PER_CASE = 10;
export declare const NO_ASSIGNEES_FILTERING_KEYWORD = "none";
export declare const KIBANA_SYSTEM_USERNAME = "elastic/kibana";
export declare const MAX_OBSERVABLES_PER_CASE = 50;
/**
 * Delays
 */
export declare const SEARCH_DEBOUNCE_MS = 500;
/**
 * Local storage keys
 */
export declare const LOCAL_STORAGE_KEYS: {
    casesTableColumns: string;
    casesTableFiltersConfig: string;
    casesTableState: string;
    templatesTableState: string;
    templatesYamlEditorCreateState: string;
    templatesYamlEditorEditState: string;
};
/**
 * Connectors
 */
export declare enum CASES_CONNECTOR_SUB_ACTION {
    RUN = "run"
}
export declare const NONE_CONNECTOR_ID: string;
export declare const CASES_CONNECTOR_ID = ".cases";
export declare const CASES_CONNECTOR_TITLE = "Cases";
export declare const CASES_CONNECTOR_TIME_WINDOW_REGEX = "^[1-9][0-9]*[d,w,h,m]$";
/**
 * This field is used for authorization of the entities within the cases plugin. Each entity within Cases will have the owner field
 * set to a string that represents the plugin that "owns" (i.e. the plugin that originally issued the POST request to
 * create the entity) the entity.
 *
 * The Authorization class constructs a string composed of the operation being performed (createCase, getComment, etc),
 * and the owner of the entity being acted upon or created. This string is then given to the Security plugin which
 * checks to see if the user making the request has that particular string stored within it's privileges. If it does,
 * then the operation succeeds, otherwise the operation fails.
 *
 * APIs that create/update an entity require that the owner field be passed in the body of the request.
 * APIs that search for entities typically require that the owner be passed as a query parameter.
 * APIs that specify an ID of an entity directly generally don't need to specify the owner field.
 *
 * For APIs that create/update an entity, the RBAC implementation checks to see if the user making the request has the
 * correct privileges for performing that action (a create/update) for the specified owner.
 * This check is done through the Security plugin's API.
 *
 * For APIs that search for entities, the RBAC implementation creates a filter for the saved objects query that limits
 * the search to only owners that the user has access to. We also check that the objects returned by the saved objects
 * API have the limited owner scope. If we find one that the user does not have permissions for, we throw a 403 error.
 * The owner field that is passed in as a query parameter can be used to further limit the results. If a user attempts
 * to pass an owner that they do not have access to, the owner is ignored.
 *
 * For APIs that retrieve/delete entities directly using their ID, the RBAC implementation requests the object first,
 * and then checks to see if the user making the request has access to that operation and owner. If the user does, the
 * operation continues, otherwise we throw a 403.
 */
export declare const OWNER_FIELD = "owner";
export declare const MAX_OBSERVABLE_TYPE_KEY_LENGTH = 36;
export declare const MAX_OBSERVABLE_TYPE_LABEL_LENGTH = 50;
export declare const MAX_CUSTOM_OBSERVABLE_TYPES = 10;
/**
 * EBT events
 */
export declare const CASE_PAGE_VIEW_EVENT_TYPE: "case_page_view";
export declare const CASE_ATTACH_EVENTS_EVENT_TYPE: "case_attach_events";
export declare const CASE_VIEW_ATTACHMENTS_TAB_CLICKED_EVENT_TYPE: "case_view_attachments_tab_clicked";
export declare const CASE_VIEW_ATTACHMENTS_SUB_TAB_CLICKED_EVENT_TYPE: "case_view_attachments_sub_tab_clicked";
/**
 * Exporting this to make it easier to track the usage across the codebase
 * via lsp references.
 */
export declare const CASE_EXTENDED_FIELDS: "extended_fields";
export declare const CASE_EXTENDED_FIELDS_LABELS: "extended_fields_labels";
