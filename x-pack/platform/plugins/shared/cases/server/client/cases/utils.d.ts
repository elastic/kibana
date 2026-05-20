import type { UserProfile } from '@kbn/security-plugin/common';
import type { IBasePath } from '@kbn/core-http-browser';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import type { SavedObject } from '@kbn/core/server';
import type { ActionConnector, Case, CaseAssignees, CaseAttributes, ConnectorMappings, ConnectorMappingSource, ConnectorMappingTarget, CustomFieldsConfiguration, ExternalService, Observable, User } from '../../../common/types/domain';
import type { Template } from '../../../common/types/domain/template/latest';
import { CaseStatuses } from '../../../common/types/domain';
import type { CasePostRequest, CaseRequestCustomFields, CaseUserActionsDeprecatedResponse, ObservablePost } from '../../../common/types/api';
import type { CasesClientGetAlertsResponse } from '../alerts/types';
import type { ExternalServiceComment, ExternalServiceIncident } from './types';
import type { CasesConnectorsMap } from '../../connectors';
interface CreateIncidentArgs {
    theCase: Case;
    userActions: CaseUserActionsDeprecatedResponse;
    connector: ActionConnector;
    alerts: CasesClientGetAlertsResponse;
    casesConnectors: CasesConnectorsMap;
    spaceId: string;
    userProfiles?: Map<string, UserProfile>;
    publicBaseUrl?: IBasePath['publicBaseUrl'];
}
export declare const dedupAssignees: (assignees?: CaseAssignees) => CaseAssignees | undefined;
export declare const getCloseReasonIfValid: (closeReason?: string) => string | undefined;
type LatestPushInfo = {
    index: number;
    pushedInfo: ExternalService | null;
} | null;
export declare const getLatestPushInfo: (connectorId: string, userActions: CaseUserActionsDeprecatedResponse) => LatestPushInfo;
export declare const createIncident: ({ theCase, userActions, connector, alerts, casesConnectors, userProfiles, spaceId, publicBaseUrl, }: CreateIncidentArgs) => Promise<ExternalServiceIncident>;
export declare const mapCaseFieldsToExternalSystemFields: (caseFields: Record<Exclude<ConnectorMappingSource, "comments" | "tags">, unknown>, mapping: ConnectorMappings) => Record<ConnectorMappingTarget, unknown>;
export declare const formatComments: ({ userActions, latestPushInfo, theCase, spaceId, userProfiles, publicBaseUrl, }: {
    theCase: Case;
    latestPushInfo: LatestPushInfo;
    userActions: CaseUserActionsDeprecatedResponse;
    spaceId: string;
    userProfiles?: Map<string, UserProfile>;
    publicBaseUrl?: IBasePath["publicBaseUrl"];
}) => ExternalServiceComment[];
export declare const addKibanaInformationToDescription: (theCase: Case, spaceId: string, userProfiles?: Map<string, UserProfile>, publicBaseUrl?: IBasePath["publicBaseUrl"]) => string;
export declare const getEntity: (entity: {
    createdBy: Case["created_by"];
    updatedBy: Case["updated_by"];
}, userProfiles?: Map<string, UserProfile>) => string;
export declare const getClosedInfoForUpdate: ({ user, status, closedDate, }: {
    closedDate: string;
    user: User;
    status?: CaseStatuses;
}) => Pick<CaseAttributes, "closed_at" | "closed_by"> | undefined;
/**
 * If the status changes to 'in-progress' and in_progress_at is not set, we set it to the current date.
 * If the status does not change to 'in-progress' or in_progress_at is already set, we do not change it.
 */
export declare const getInProgressInfoForUpdate: ({ status, stateTransitionTimestamp, inProgressAt, }: {
    status?: CaseStatuses;
    stateTransitionTimestamp: string;
    inProgressAt?: string | null;
}) => Partial<Pick<CaseAttributes, "in_progress_at">> | undefined;
/**
 * Calculates timing metrics based on the case status and timestamps.
 * If the status is 'closed', it calculates all metrics.
 * If the status is 'in-progress', it calculates only the time to acknowledge and sets the other metrics to null.
 * If the status is 'open', it nullifies all metrics.
 */
export declare const getTimingMetricsForUpdate: ({ status, createdAt, inProgressAt, stateTransitionTimestamp, }: {
    status?: CaseStatuses;
    createdAt: string;
    stateTransitionTimestamp: string;
    inProgressAt?: string | null;
}) => Partial<Pick<CaseAttributes, "time_to_acknowledge" | "time_to_investigate" | "time_to_resolve">> | undefined;
export declare const getDurationInSeconds: ({ closedAt, createdAt, }: {
    closedAt: string;
    createdAt: CaseAttributes["created_at"];
}) => {
    duration: number;
} | undefined;
export declare const getDurationForUpdate: ({ status, closedAt, createdAt, }: {
    closedAt: string;
    createdAt: CaseAttributes["created_at"];
    status?: CaseStatuses;
}) => Pick<CaseAttributes, "duration"> | undefined;
export declare const getUserProfiles: (securityStartPlugin: SecurityPluginStart, uids: Set<string>, dataPath?: string) => Promise<Map<string, UserProfileWithAvatar>>;
export declare const fillMissingCustomFields: ({ customFields, customFieldsConfiguration, }: {
    customFields?: CaseRequestCustomFields;
    customFieldsConfiguration?: CustomFieldsConfiguration;
}) => CaseRequestCustomFields;
export declare const normalizeCreateCaseRequest: (request: CasePostRequest, customFieldsConfiguration?: CustomFieldsConfiguration) => {
    title: string;
    description: string;
    category: string | null;
    tags: string[];
    customFields: ({
        key: string;
        type: import("../../../common/types/domain").CustomFieldTypes.TOGGLE;
        value: boolean | null;
    } | {
        key: string;
        type: import("../../../common/types/domain").CustomFieldTypes.TEXT;
        value: string | null;
    } | {
        key: string;
        type: import("../../../common/types/domain").CustomFieldTypes.NUMBER;
        value: number | null;
    })[];
    connector: {
        id: string;
    } & (({
        type: import("../../../common/types/domain").ConnectorTypes.casesWebhook;
        fields: null;
    } & {
        name: string;
    }) | ({
        type: import("../../../common/types/domain").ConnectorTypes.jira;
        fields: ({
            issueType: string | null;
            priority: string | null;
            parent: string | null;
        } & {
            otherFields?: string | null | undefined;
        }) | null;
    } & {
        name: string;
    }) | ({
        type: import("../../../common/types/domain").ConnectorTypes.none;
        fields: null;
    } & {
        name: string;
    }) | ({
        type: import("../../../common/types/domain").ConnectorTypes.resilient;
        fields: ({
            incidentTypes: string[] | null;
            severityCode: string | null;
        } & {
            additionalFields?: string | null | undefined;
        }) | null;
    } & {
        additionalFields?: string | null | undefined;
    } & {
        name: string;
    }) | ({
        type: import("../../../common/types/domain").ConnectorTypes.serviceNowITSM;
        fields: ({
            impact: string | null;
            severity: string | null;
            urgency: string | null;
            category: string | null;
            subcategory: string | null;
        } & {
            additionalFields?: string | null | undefined;
        }) | null;
    } & {
        name: string;
    }) | ({
        type: import("../../../common/types/domain").ConnectorTypes.serviceNowSIR;
        fields: ({
            category: string | null;
            destIp: boolean | null;
            malwareHash: boolean | null;
            malwareUrl: boolean | null;
            priority: string | null;
            sourceIp: boolean | null;
            subcategory: string | null;
        } & {
            additionalFields?: string | null | undefined;
        }) | null;
    } & {
        name: string;
    }) | ({
        type: import("../../../common/types/domain").ConnectorTypes.swimlane;
        fields: {
            caseId: string | null;
        } | null;
    } & {
        name: string;
    }) | ({
        type: import("../../../common/types/domain").ConnectorTypes.theHive;
        fields: {
            tlp: number | null;
        } | null;
    } & {
        name: string;
    }));
    settings: {
        syncAlerts: boolean;
    } & {
        extractObservables?: boolean | undefined;
    };
    owner: string;
    assignees?: {
        uid: string;
    }[] | undefined;
    severity?: import("../../../common/types/domain").CaseSeverity | undefined;
    template?: {
        id: string;
        version: number;
    } | null | undefined;
    extended_fields?: {
        [x: string]: string;
    } | undefined;
};
export declare const isObservable: (observable: ObservablePost | Observable) => observable is Observable;
export declare const processObservables: (observablesMap: Map<string, Observable>, observable: ObservablePost | Observable) => void;
/**
 *
 * For cases that have a template and extended fields, fetches the template definitions
 * and populates `extended_fields_labels` with a mapping from storage keys (e.g.,
 * `priority_as_keyword`) to user-facing labels (e.g., "Priority"). Cases without templates
 * or extended fields, or whose templates cannot be retrieved, are returned unchanged.
 *
 * @param cases - Array of cases to enrich
 * @param templateSOs - Pre-fetched template saved objects
 * @returns The enriched cases array, preserving original order
 */
export declare const enrichCasesWithFieldLabels: (cases: Case[], templateSOs: Array<SavedObject<Template>>) => Case[];
export {};
