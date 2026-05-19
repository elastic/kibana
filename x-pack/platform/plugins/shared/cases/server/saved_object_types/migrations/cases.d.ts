import type { SavedObjectUnsanitizedDoc, SavedObjectSanitizedDoc } from '@kbn/core/server';
import { CaseSeverity, ConnectorTypes } from '../../../common/types/domain';
import type { SanitizedCaseOwner } from '.';
import type { ConnectorPersistedFields } from '../../common/types/connectors';
import { CasePersistedSeverity, CasePersistedStatus } from '../../common/types/case';
import type { CaseAttributes } from '../../../common/types/domain';
interface UnsanitizedCaseConnector {
    connector_id: string;
}
interface SanitizedCaseConnector {
    connector: {
        id: string;
        name: string | null;
        type: string | null;
        fields: null | ConnectorPersistedFields;
    };
}
interface SanitizedCaseSettings {
    settings: {
        syncAlerts: boolean;
    };
}
interface SanitizedCaseType {
    type: string;
}
interface ConnectorIdFields {
    connector?: {
        id?: string;
    };
    external_service?: {
        connector_id?: string | null;
    } | null;
}
export declare const caseConnectorIdMigration: (doc: SavedObjectUnsanitizedDoc<ConnectorIdFields>) => SavedObjectSanitizedDoc<unknown>;
export declare const removeCaseType: (doc: SavedObjectUnsanitizedDoc<Record<string, unknown>>) => SavedObjectSanitizedDoc<unknown>;
export declare const addDuration: (doc: SavedObjectUnsanitizedDoc<Omit<CaseAttributes, "duration">>) => SavedObjectSanitizedDoc<CaseAttributes>;
export declare const addSeverity: (doc: SavedObjectUnsanitizedDoc<CaseAttributes>) => SavedObjectSanitizedDoc<CaseAttributes>;
export declare const addAssignees: (doc: SavedObjectUnsanitizedDoc<CaseAttributes>) => SavedObjectSanitizedDoc<CaseAttributes>;
export declare const convertSeverity: (doc: SavedObjectUnsanitizedDoc<CaseAttributes>) => SavedObjectSanitizedDoc<Omit<CaseAttributes, "severity"> & {
    severity: CasePersistedSeverity;
}>;
export declare const convertStatus: (doc: SavedObjectUnsanitizedDoc<CaseAttributes>) => SavedObjectSanitizedDoc<Omit<CaseAttributes, "status"> & {
    status: CasePersistedStatus;
}>;
export declare const addTotalAlerts: (doc: SavedObjectUnsanitizedDoc<CaseAttributes>) => SavedObjectSanitizedDoc<CaseAttributes & {
    total_alerts: number;
}>;
export declare const addTotalComments: (doc: SavedObjectUnsanitizedDoc<CaseAttributes>) => SavedObjectSanitizedDoc<CaseAttributes & {
    total_comments: number;
}>;
export declare const caseMigrations: {
    '7.10.0': (doc: SavedObjectUnsanitizedDoc<UnsanitizedCaseConnector>) => SavedObjectSanitizedDoc<SanitizedCaseConnector>;
    '7.11.0': (doc: SavedObjectUnsanitizedDoc<Record<string, unknown>>) => SavedObjectSanitizedDoc<SanitizedCaseSettings>;
    '7.12.0': (doc: SavedObjectUnsanitizedDoc<SanitizedCaseConnector>) => SavedObjectSanitizedDoc<SanitizedCaseType & SanitizedCaseConnector>;
    '7.14.0': (doc: SavedObjectUnsanitizedDoc<Record<string, unknown>>) => SavedObjectSanitizedDoc<SanitizedCaseOwner>;
    '7.15.0': (doc: SavedObjectUnsanitizedDoc<ConnectorIdFields>) => SavedObjectSanitizedDoc<unknown>;
    '8.1.0': (doc: SavedObjectUnsanitizedDoc<Record<string, unknown>>) => SavedObjectSanitizedDoc<unknown>;
    '8.3.0': (doc: SavedObjectUnsanitizedDoc<{
        description: string;
        tags: string[];
        title: string;
        connector: {
            id: string;
        } & (({
            type: ConnectorTypes.casesWebhook;
            fields: null;
        } & {
            name: string;
        }) | ({
            type: ConnectorTypes.jira;
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
            type: ConnectorTypes.none;
            fields: null;
        } & {
            name: string;
        }) | ({
            type: ConnectorTypes.resilient;
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
            type: ConnectorTypes.serviceNowITSM;
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
            type: ConnectorTypes.serviceNowSIR;
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
            type: ConnectorTypes.swimlane;
            fields: {
                caseId: string | null;
            } | null;
        } & {
            name: string;
        }) | ({
            type: ConnectorTypes.theHive;
            fields: {
                tlp: number | null;
            } | null;
        } & {
            name: string;
        }));
        severity: CaseSeverity;
        assignees: {
            uid: string;
        }[];
        category: string | null;
        customFields: ({
            key: string;
            type: import("../../../common/types/domain").CustomFieldTypes.TEXT;
            value: string | null;
        } | {
            key: string;
            type: import("../../../common/types/domain").CustomFieldTypes.TOGGLE;
            value: boolean | null;
        } | {
            key: string;
            type: import("../../../common/types/domain").CustomFieldTypes.NUMBER;
            value: number | null;
        })[];
        settings: {
            syncAlerts: boolean;
        } & {
            extractObservables?: boolean | undefined;
        };
        observables: ({
            id: string;
            createdAt: string;
            updatedAt: string | null;
        } & {
            typeKey: string;
            value: string;
            description: string | null;
        })[];
        status: import("@kbn/cases-components/src/status/types").CaseStatuses;
        owner: string;
    } & {
        duration: number | null;
        closed_at: string | null;
        closed_by: ({
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        } & {
            profile_uid?: string | undefined;
        }) | null;
        created_at: string;
        created_by: {
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        } & {
            profile_uid?: string | undefined;
        };
        external_service: ({
            connector_id: string;
        } & {
            connector_name: string;
            external_id: string;
            external_title: string;
            external_url: string;
            pushed_at: string;
            pushed_by: {
                email: string | null | undefined;
                full_name: string | null | undefined;
                username: string | null | undefined;
            } & {
                profile_uid?: string | undefined;
            };
        }) | null;
        updated_at: string | null;
        updated_by: ({
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        } & {
            profile_uid?: string | undefined;
        }) | null;
        total_observables: number | null;
    } & {
        incremental_id?: number | null | undefined;
        in_progress_at?: string | null | undefined;
        time_to_acknowledge?: number | null | undefined;
        time_to_investigate?: number | null | undefined;
        time_to_resolve?: number | null | undefined;
        template?: {
            id: string;
            version: number;
        } | null | undefined;
        extended_fields?: {
            [x: string]: string;
        } | undefined;
    }>) => SavedObjectUnsanitizedDoc<{
        description: string;
        tags: string[];
        title: string;
        connector: {
            id: string;
        } & (({
            type: ConnectorTypes.casesWebhook;
            fields: null;
        } & {
            name: string;
        }) | ({
            type: ConnectorTypes.jira;
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
            type: ConnectorTypes.none;
            fields: null;
        } & {
            name: string;
        }) | ({
            type: ConnectorTypes.resilient;
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
            type: ConnectorTypes.serviceNowITSM;
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
            type: ConnectorTypes.serviceNowSIR;
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
            type: ConnectorTypes.swimlane;
            fields: {
                caseId: string | null;
            } | null;
        } & {
            name: string;
        }) | ({
            type: ConnectorTypes.theHive;
            fields: {
                tlp: number | null;
            } | null;
        } & {
            name: string;
        }));
        severity: CaseSeverity;
        assignees: {
            uid: string;
        }[];
        category: string | null;
        customFields: ({
            key: string;
            type: import("../../../common/types/domain").CustomFieldTypes.TEXT;
            value: string | null;
        } | {
            key: string;
            type: import("../../../common/types/domain").CustomFieldTypes.TOGGLE;
            value: boolean | null;
        } | {
            key: string;
            type: import("../../../common/types/domain").CustomFieldTypes.NUMBER;
            value: number | null;
        })[];
        settings: {
            syncAlerts: boolean;
        } & {
            extractObservables?: boolean | undefined;
        };
        observables: ({
            id: string;
            createdAt: string;
            updatedAt: string | null;
        } & {
            typeKey: string;
            value: string;
            description: string | null;
        })[];
        status: import("@kbn/cases-components/src/status/types").CaseStatuses;
        owner: string;
    } & {
        duration: number | null;
        closed_at: string | null;
        closed_by: ({
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        } & {
            profile_uid?: string | undefined;
        }) | null;
        created_at: string;
        created_by: {
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        } & {
            profile_uid?: string | undefined;
        };
        external_service: ({
            connector_id: string;
        } & {
            connector_name: string;
            external_id: string;
            external_title: string;
            external_url: string;
            pushed_at: string;
            pushed_by: {
                email: string | null | undefined;
                full_name: string | null | undefined;
                username: string | null | undefined;
            } & {
                profile_uid?: string | undefined;
            };
        }) | null;
        updated_at: string | null;
        updated_by: ({
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        } & {
            profile_uid?: string | undefined;
        }) | null;
        total_observables: number | null;
    } & {
        incremental_id?: number | null | undefined;
        in_progress_at?: string | null | undefined;
        time_to_acknowledge?: number | null | undefined;
        time_to_investigate?: number | null | undefined;
        time_to_resolve?: number | null | undefined;
        template?: {
            id: string;
            version: number;
        } | null | undefined;
        extended_fields?: {
            [x: string]: string;
        } | undefined;
    }>;
    '8.5.0': (doc: SavedObjectUnsanitizedDoc<CaseAttributes>) => SavedObjectSanitizedDoc<CaseAttributes>;
    '8.7.0': (...args: any[]) => any;
};
export {};
