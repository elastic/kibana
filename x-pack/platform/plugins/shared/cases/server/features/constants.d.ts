/**
 * Unique sub privilege ids for cases.
 * @description When upgrading (creating new versions), the sub-privileges
 * do not need to be versioned as they are appended to the top level privilege id which is the only id
 * that will need to be versioned
 */
export declare const CASES_DELETE_SUB_PRIVILEGE_ID = "cases_delete";
export declare const CASES_SETTINGS_SUB_PRIVILEGE_ID = "cases_settings";
export declare const CASES_CREATE_COMMENT_SUB_PRIVILEGE_ID = "create_comment";
export declare const CASES_REOPEN_SUB_PRIVILEGE_ID = "case_reopen";
export declare const CASES_ASSIGN_SUB_PRIVILEGE_ID = "cases_assign";
export declare const CASES_MANAGE_TEMPLATES_SUB_PRIVILEGE_ID = "cases_manage_templates";
