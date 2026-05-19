import { CaseSeverity, CaseStatuses } from '../../common/types/domain';
import { CasePersistedSeverity, CasePersistedStatus } from './types/case';
/**
 * The name of the saved object reference indicating the action connector ID. This is stored in the Saved Object reference
 * field's name property.
 */
export declare const CONNECTOR_ID_REFERENCE_NAME = "connectorId";
/**
 * The name of the saved object reference indicating the action connector ID that was used to push a case.
 */
export declare const PUSH_CONNECTOR_ID_REFERENCE_NAME = "pushConnectorId";
/**
 * The name of the saved object reference indicating the caseId reference
 */
export declare const CASE_REF_NAME: string;
/**
 * The name of the saved object reference indicating the commentId reference
 */
export declare const COMMENT_REF_NAME: string;
/**
 * The name of the saved object reference indicating the externalReferenceId reference
 */
export declare const EXTERNAL_REFERENCE_REF_NAME = "externalReferenceId";
/**
 * The name of the saved object reference indicating the attachmentId reference
 */
export declare const ATTACHMENT_ID_REF_NAME = "attachmentId";
/**
 * The name of the licensing feature to notify for feature usage with the licensing plugin
 */
export declare const LICENSING_CASE_ASSIGNMENT_FEATURE = "Cases user usage";
/**
 * The name of the licensing feature to notify for cases feature usage with the licensing plugin
 */
export declare const LICENSING_CASE_OBSERVABLES_FEATURE = "Cases observable assignment";
export declare const SEVERITY_EXTERNAL_TO_ESMODEL: Record<CaseSeverity, CasePersistedSeverity>;
export declare const SEVERITY_ESMODEL_TO_EXTERNAL: Record<CasePersistedSeverity, CaseSeverity>;
export declare const STATUS_EXTERNAL_TO_ESMODEL: Record<CaseStatuses, CasePersistedStatus>;
export declare const STATUS_ESMODEL_TO_EXTERNAL: Record<CasePersistedStatus, CaseStatuses>;
