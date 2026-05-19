import type { SavedObject } from '@kbn/core-saved-objects-server';
import type { Type } from 'io-ts';
import type { CaseAttributes, Observable } from '../../../common/types/domain';
import type { ConnectorPersisted } from './connectors';
import type { ExternalServicePersisted } from './external_service';
import type { User, UserProfile } from './user';
export declare enum CasePersistedSeverity {
    LOW = 0,
    MEDIUM = 10,
    HIGH = 20,
    CRITICAL = 30
}
export declare enum CasePersistedStatus {
    OPEN = 0,
    IN_PROGRESS = 10,
    CLOSED = 20
}
export interface CasePersistedAttributes {
    assignees: UserProfile[];
    closed_at: string | null;
    closed_by: User | null;
    created_at: string;
    created_by: User;
    in_progress_at?: string | null;
    connector: ConnectorPersisted;
    description: string;
    duration: number | null;
    external_service: ExternalServicePersisted | null;
    owner: string;
    settings: {
        syncAlerts: boolean;
        extractObservables?: boolean;
    };
    severity: CasePersistedSeverity;
    status: CasePersistedStatus;
    tags: string[];
    title: string;
    total_alerts: number;
    total_comments: number;
    total_events?: number;
    total_observables?: number;
    updated_at: string | null;
    updated_by: User | null;
    category?: string | null;
    customFields?: CasePersistedCustomFields;
    observables?: Observable[];
    incremental_id?: number | null;
    time_to_acknowledge?: number | null;
    time_to_investigate?: number | null;
    time_to_resolve?: number | null;
    template?: {
        id: string;
        version: number;
    } | null;
    extended_fields?: Record<string, unknown> | null;
}
type CasePersistedCustomFields = Array<{
    key: string;
    type: string;
    value: null | unknown;
}>;
export type CaseTransformedAttributes = CaseAttributes;
export type CaseTransformedAttributesWithAttachmentStats = CaseAttributes & {
    total_comments: number;
    total_alerts: number;
    total_events: number;
};
export declare const CaseTransformedAttributesRt: import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
    description: import("io-ts").StringC;
    tags: import("io-ts").ArrayC<import("io-ts").StringC>;
    title: import("io-ts").StringC;
    connector: import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
        id: import("io-ts").StringC;
    }>>, import("io-ts").UnionC<[import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
        type: import("io-ts").LiteralC<import("../../../common/types/domain").ConnectorTypes.casesWebhook>;
        fields: import("io-ts").NullC;
    }>>, import("io-ts").ExactC<import("io-ts").TypeC<{
        name: import("io-ts").StringC;
    }>>]>, import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
        type: import("io-ts").LiteralC<import("../../../common/types/domain").ConnectorTypes.jira>;
        fields: import("io-ts").UnionC<[import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
            issueType: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
            priority: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
            parent: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
        }>>, import("io-ts").ExactC<import("io-ts").PartialC<{
            otherFields: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
        }>>]>, import("io-ts").NullC]>;
    }>>, import("io-ts").ExactC<import("io-ts").TypeC<{
        name: import("io-ts").StringC;
    }>>]>, import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
        type: import("io-ts").LiteralC<import("../../../common/types/domain").ConnectorTypes.none>;
        fields: import("io-ts").NullC;
    }>>, import("io-ts").ExactC<import("io-ts").TypeC<{
        name: import("io-ts").StringC;
    }>>]>, import("io-ts").IntersectionC<[import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
        type: import("io-ts").LiteralC<import("../../../common/types/domain").ConnectorTypes.resilient>;
        fields: import("io-ts").UnionC<[import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
            incidentTypes: import("io-ts").UnionC<[import("io-ts").ArrayC<import("io-ts").StringC>, import("io-ts").NullC]>;
            severityCode: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
        }>>, import("io-ts").ExactC<import("io-ts").PartialC<{
            additionalFields: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
        }>>]>, import("io-ts").NullC]>;
    }>>, import("io-ts").ExactC<import("io-ts").PartialC<{
        additionalFields: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
    }>>]>, import("io-ts").ExactC<import("io-ts").TypeC<{
        name: import("io-ts").StringC;
    }>>]>, import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
        type: import("io-ts").LiteralC<import("../../../common/types/domain").ConnectorTypes.serviceNowITSM>;
        fields: import("io-ts").UnionC<[import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
            impact: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
            severity: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
            urgency: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
            category: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
            subcategory: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
        }>>, import("io-ts").ExactC<import("io-ts").PartialC<{
            additionalFields: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
        }>>]>, import("io-ts").NullC]>;
    }>>, import("io-ts").ExactC<import("io-ts").TypeC<{
        name: import("io-ts").StringC;
    }>>]>, import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
        type: import("io-ts").LiteralC<import("../../../common/types/domain").ConnectorTypes.serviceNowSIR>;
        fields: import("io-ts").UnionC<[import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
            category: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
            destIp: import("io-ts").UnionC<[import("io-ts").BooleanC, import("io-ts").NullC]>;
            malwareHash: import("io-ts").UnionC<[import("io-ts").BooleanC, import("io-ts").NullC]>;
            malwareUrl: import("io-ts").UnionC<[import("io-ts").BooleanC, import("io-ts").NullC]>;
            priority: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
            sourceIp: import("io-ts").UnionC<[import("io-ts").BooleanC, import("io-ts").NullC]>;
            subcategory: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
        }>>, import("io-ts").ExactC<import("io-ts").PartialC<{
            additionalFields: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
        }>>]>, import("io-ts").NullC]>;
    }>>, import("io-ts").ExactC<import("io-ts").TypeC<{
        name: import("io-ts").StringC;
    }>>]>, import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
        type: import("io-ts").LiteralC<import("../../../common/types/domain").ConnectorTypes.swimlane>;
        fields: import("io-ts").UnionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
            caseId: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
        }>>, import("io-ts").NullC]>;
    }>>, import("io-ts").ExactC<import("io-ts").TypeC<{
        name: import("io-ts").StringC;
    }>>]>, import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
        type: import("io-ts").LiteralC<import("../../../common/types/domain").ConnectorTypes.theHive>;
        fields: import("io-ts").UnionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
            tlp: import("io-ts").UnionC<[import("io-ts").NumberC, import("io-ts").NullC]>;
        }>>, import("io-ts").NullC]>;
    }>>, import("io-ts").ExactC<import("io-ts").TypeC<{
        name: import("io-ts").StringC;
    }>>]>]>]>;
    severity: import("io-ts").UnionC<[import("io-ts").LiteralC<import("../../../common/types/domain").CaseSeverity.LOW>, import("io-ts").LiteralC<import("../../../common/types/domain").CaseSeverity.MEDIUM>, import("io-ts").LiteralC<import("../../../common/types/domain").CaseSeverity.HIGH>, import("io-ts").LiteralC<import("../../../common/types/domain").CaseSeverity.CRITICAL>]>;
    assignees: import("io-ts").ArrayC<import("io-ts").ExactC<import("io-ts").TypeC<{
        uid: import("io-ts").StringC;
    }>>>;
    category: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
    customFields: import("io-ts").ArrayC<import("io-ts").UnionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
        key: import("io-ts").StringC;
        type: import("io-ts").LiteralC<import("../../../common/types/domain").CustomFieldTypes.TEXT>;
        value: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
    }>>, import("io-ts").ExactC<import("io-ts").TypeC<{
        key: import("io-ts").StringC;
        type: import("io-ts").LiteralC<import("../../../common/types/domain").CustomFieldTypes.TOGGLE>;
        value: import("io-ts").UnionC<[import("io-ts").BooleanC, import("io-ts").NullC]>;
    }>>, import("io-ts").ExactC<import("io-ts").TypeC<{
        key: import("io-ts").StringC;
        type: import("io-ts").LiteralC<import("../../../common/types/domain").CustomFieldTypes.NUMBER>;
        value: import("io-ts").UnionC<[import("io-ts").NumberC, import("io-ts").NullC]>;
    }>>]>>;
    settings: import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
        syncAlerts: import("io-ts").BooleanC;
    }>>, import("io-ts").ExactC<import("io-ts").PartialC<{
        extractObservables: import("io-ts").BooleanC;
    }>>]>;
    observables: import("io-ts").ArrayC<import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
        id: import("io-ts").StringC;
        createdAt: import("io-ts").StringC;
        updatedAt: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
    }>>, import("io-ts").ExactC<import("io-ts").TypeC<{
        typeKey: import("io-ts").StringC;
        value: import("io-ts").StringC;
        description: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
    }>>]>>;
    status: import("io-ts").UnionC<[import("io-ts").LiteralC<import("@kbn/cases-components/src/status/types").CaseStatuses.open>, import("io-ts").LiteralC<typeof import("@kbn/cases-components/src/status/types").CaseStatuses["in-progress"]>, import("io-ts").LiteralC<import("@kbn/cases-components/src/status/types").CaseStatuses.closed>]>;
    owner: import("io-ts").StringC;
}>>, import("io-ts").ExactC<import("io-ts").TypeC<{
    duration: import("io-ts").UnionC<[import("io-ts").NumberC, import("io-ts").NullC]>;
    closed_at: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
    closed_by: import("io-ts").UnionC<[import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
        email: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
        full_name: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
        username: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
    }>>, import("io-ts").ExactC<import("io-ts").PartialC<{
        profile_uid: import("io-ts").StringC;
    }>>]>, import("io-ts").NullC]>;
    created_at: import("io-ts").StringC;
    created_by: import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
        email: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
        full_name: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
        username: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
    }>>, import("io-ts").ExactC<import("io-ts").PartialC<{
        profile_uid: import("io-ts").StringC;
    }>>]>;
    external_service: import("io-ts").UnionC<[import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
        connector_id: import("io-ts").StringC;
    }>>, import("io-ts").ExactC<import("io-ts").TypeC<{
        connector_name: import("io-ts").StringC;
        external_id: import("io-ts").StringC;
        external_title: import("io-ts").StringC;
        external_url: import("io-ts").StringC;
        pushed_at: import("io-ts").StringC;
        pushed_by: import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
            email: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
            full_name: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
            username: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
        }>>, import("io-ts").ExactC<import("io-ts").PartialC<{
            profile_uid: import("io-ts").StringC;
        }>>]>;
    }>>]>, import("io-ts").NullC]>;
    updated_at: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
    updated_by: import("io-ts").UnionC<[import("io-ts").IntersectionC<[import("io-ts").ExactC<import("io-ts").TypeC<{
        email: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
        full_name: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
        username: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").NullC, import("io-ts").StringC]>;
    }>>, import("io-ts").ExactC<import("io-ts").PartialC<{
        profile_uid: import("io-ts").StringC;
    }>>]>, import("io-ts").NullC]>;
    total_observables: import("io-ts").UnionC<[import("io-ts").NumberC, import("io-ts").NullC]>;
}>>, import("io-ts").ExactC<import("io-ts").PartialC<{
    incremental_id: import("io-ts").UnionC<[import("io-ts").NumberC, import("io-ts").NullC]>;
    in_progress_at: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
    time_to_acknowledge: import("io-ts").UnionC<[import("io-ts").NumberC, import("io-ts").NullC]>;
    time_to_investigate: import("io-ts").UnionC<[import("io-ts").NumberC, import("io-ts").NullC]>;
    time_to_resolve: import("io-ts").UnionC<[import("io-ts").NumberC, import("io-ts").NullC]>;
    template: import("io-ts").UnionC<[import("io-ts").NullC, import("io-ts").ExactC<import("io-ts").TypeC<{
        id: import("io-ts").StringC;
        version: import("io-ts").NumberC;
    }>>]>;
    extended_fields: import("io-ts").RecordC<import("io-ts").StringC, import("io-ts").StringC>;
}>>]>;
export declare const getPartialCaseTransformedAttributesRt: () => Type<Partial<CaseTransformedAttributesWithAttachmentStats>>;
export type CaseSavedObject = SavedObject<CasePersistedAttributes>;
export type CaseSavedObjectTransformed = SavedObject<CaseTransformedAttributes>;
export declare const OwnerRt: import("io-ts").ExactC<import("io-ts").TypeC<{
    owner: import("io-ts").StringC;
}>>;
export {};
