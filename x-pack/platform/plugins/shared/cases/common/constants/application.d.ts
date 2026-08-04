/**
 * Application
 */
export declare const APP_ID: "cases";
/** @deprecated Please use FEATURE_ID_V3 instead */
export declare const FEATURE_ID: "generalCases";
/** @deprecated Please use FEATURE_ID_V3 instead */
export declare const FEATURE_ID_V2: "generalCasesV2";
export declare const FEATURE_ID_V3: "generalCasesV3";
export declare const APP_OWNER: "cases";
export declare const APP_PATH: "/app/management/insightsAndAlerting/cases";
export declare const CASES_CREATE_PATH: "/create";
export declare const CASES_CONFIGURE_PATH: "/configure";
export declare const CASE_VIEW_PATH: "/:detailName";
export declare const CASE_VIEW_COMMENT_PATH: "/:detailName/:commentId";
export declare const CASE_VIEW_ALERT_TABLE_PATH: "/:detailName/?tabId=alerts";
export declare const CASE_VIEW_TAB_PATH: "/:detailName/?tabId=:tabId";
export declare const CASES_CONFIGURE_TEMPLATES_PATH: "/configure/templates";
export declare const CASES_CONFIGURE_CREATE_TEMPLATE_PATH: "/configure/templates/create";
export declare const CASES_CONFIGURE_EDIT_TEMPLATE_PATH: "/configure/templates/:templateId/edit";
export declare const CASES_CONFIGURE_FIELD_LIBRARY_PATH: "/configure/field_library";
/**
 * The main Cases application is in the stack management under the
 * Alerts and Insights section. To do that, Cases registers to the management
 * application. This constant holds the application ID of the management plugin
 */
export declare const STACK_APP_ID: "management";
