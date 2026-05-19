import type { ToastInputFields } from '@kbn/core/public';
import { AttachmentType } from '../../common/types/domain';
import type { CasePatchRequest, CaseResolveResponse, CasesPatchResponse, CaseUserActionStatsResponse, FindCasesContainingAllAlertsResponse, SingleCaseMetricsResponse } from '../../common/types/api';
import type { Case, Cases, Configuration, Configurations, User, UserActions } from '../../common/types/domain';
import type { CaseUI, ExtendedFieldFilter, FilterOptions, UpdateByKey } from './types';
export declare const getTypedPayload: <T>(a: unknown) => T;
export declare const covertToSnakeCase: (obj: Record<string, unknown>) => Record<string, unknown>;
export declare const createToasterPlainError: (message: string) => ToasterError;
export declare const decodeCaseResponse: (respCase?: Case) => {
    description: string;
    tags: string[];
    title: string;
    connector: {
        id: string;
    } & (({
        type: import("../../common/types/domain").ConnectorTypes.casesWebhook;
        fields: null;
    } & {
        name: string;
    }) | ({
        type: import("../../common/types/domain").ConnectorTypes.jira;
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
        type: import("../../common/types/domain").ConnectorTypes.none;
        fields: null;
    } & {
        name: string;
    }) | ({
        type: import("../../common/types/domain").ConnectorTypes.resilient;
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
        type: import("../../common/types/domain").ConnectorTypes.serviceNowITSM;
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
        type: import("../../common/types/domain").ConnectorTypes.serviceNowSIR;
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
        type: import("../../common/types/domain").ConnectorTypes.swimlane;
        fields: {
            caseId: string | null;
        } | null;
    } & {
        name: string;
    }) | ({
        type: import("../../common/types/domain").ConnectorTypes.theHive;
        fields: {
            tlp: number | null;
        } | null;
    } & {
        name: string;
    }));
    severity: import("../../common/types/domain").CaseSeverity;
    assignees: {
        uid: string;
    }[];
    category: string | null;
    customFields: ({
        key: string;
        type: import("../../common/types/domain").CustomFieldTypes.TEXT;
        value: string | null;
    } | {
        key: string;
        type: import("../../common/types/domain").CustomFieldTypes.TOGGLE;
        value: boolean | null;
    } | {
        key: string;
        type: import("../../common/types/domain").CustomFieldTypes.NUMBER;
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
} & {
    id: string;
    totalComment: number;
    totalAlerts: number;
    totalEvents: number | undefined;
    version: string;
} & {
    comments?: (((({
        comment: string;
        type: AttachmentType.user;
        owner: string;
    } & {
        created_at: string;
        created_by: {
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        } & {
            profile_uid?: string | undefined;
        };
        owner: string;
        pushed_at: string | null;
        pushed_by: ({
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        } & {
            profile_uid?: string | undefined;
        }) | null;
        updated_at: string | null;
        updated_by: ({
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        } & {
            profile_uid?: string | undefined;
        }) | null;
    }) | ({
        type: AttachmentType.alert;
        alertId: string | string[];
        index: string | string[];
        rule: {
            id: string | null;
            name: string | null;
        };
        owner: string;
    } & {
        created_at: string;
        created_by: {
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        } & {
            profile_uid?: string | undefined;
        };
        owner: string;
        pushed_at: string | null;
        pushed_by: ({
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        } & {
            profile_uid?: string | undefined;
        }) | null;
        updated_at: string | null;
        updated_by: ({
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        } & {
            profile_uid?: string | undefined;
        }) | null;
    }) | ({
        type: AttachmentType.event;
        eventId: string | string[];
        index: string | string[];
        owner: string;
    } & {
        created_at: string;
        created_by: {
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        } & {
            profile_uid?: string | undefined;
        };
        owner: string;
        pushed_at: string | null;
        pushed_by: ({
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        } & {
            profile_uid?: string | undefined;
        }) | null;
        updated_at: string | null;
        updated_by: ({
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        } & {
            profile_uid?: string | undefined;
        }) | null;
    }) | ({
        type: AttachmentType.actions;
        comment: string;
        actions: {
            targets: {
                hostname: string;
                endpointId: string;
            }[];
            type: string;
        };
        owner: string;
    } & {
        created_at: string;
        created_by: {
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        } & {
            profile_uid?: string | undefined;
        };
        owner: string;
        pushed_at: string | null;
        pushed_by: ({
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        } & {
            profile_uid?: string | undefined;
        }) | null;
        updated_at: string | null;
        updated_by: ({
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        } & {
            profile_uid?: string | undefined;
        }) | null;
    }) | (({
        externalReferenceId: string;
        externalReferenceStorage: {
            type: import("../../common/types/domain").ExternalReferenceStorageType.elasticSearchDoc;
        };
        externalReferenceAttachmentTypeId: string;
        externalReferenceMetadata: {
            [x: string]: import("@kbn/utility-types").JsonValue;
        } | null;
        type: AttachmentType.externalReference;
        owner: string;
    } | {
        externalReferenceId: string;
        externalReferenceStorage: {
            type: import("../../common/types/domain").ExternalReferenceStorageType.savedObject;
            soType: string;
        };
        externalReferenceAttachmentTypeId: string;
        externalReferenceMetadata: {
            [x: string]: import("@kbn/utility-types").JsonValue;
        } | null;
        type: AttachmentType.externalReference;
        owner: string;
    }) & {
        created_at: string;
        created_by: {
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        } & {
            profile_uid?: string | undefined;
        };
        owner: string;
        pushed_at: string | null;
        pushed_by: ({
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        } & {
            profile_uid?: string | undefined;
        }) | null;
        updated_at: string | null;
        updated_by: ({
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        } & {
            profile_uid?: string | undefined;
        }) | null;
    }) | ({
        type: AttachmentType.persistableState;
        owner: string;
        persistableStateAttachmentTypeId: string;
        persistableStateAttachmentState: {
            [x: string]: import("@kbn/utility-types").JsonValue;
        };
    } & {
        created_at: string;
        created_by: {
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        } & {
            profile_uid?: string | undefined;
        };
        owner: string;
        pushed_at: string | null;
        pushed_by: ({
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        } & {
            profile_uid?: string | undefined;
        }) | null;
        updated_at: string | null;
        updated_by: ({
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        } & {
            profile_uid?: string | undefined;
        }) | null;
    })) & {
        id: string;
        version: string;
    }) | (((({
        type: string;
        attachmentId: string | string[];
        owner: string;
    } & {
        data?: {
            [x: string]: import("@kbn/utility-types").JsonValue;
        } | null | undefined;
        metadata?: {
            [x: string]: import("@kbn/utility-types").JsonValue;
        } | null | undefined;
    }) | ({
        type: string;
        data: {
            [x: string]: import("@kbn/utility-types").JsonValue;
        };
        owner: string;
    } & {
        metadata?: {
            [x: string]: import("@kbn/utility-types").JsonValue;
        } | null | undefined;
    })) & {
        created_at: string;
        created_by: {
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        } & {
            profile_uid?: string | undefined;
        };
        owner: string;
        pushed_at: string | null;
        pushed_by: ({
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        } & {
            profile_uid?: string | undefined;
        }) | null;
        updated_at: string | null;
        updated_by: ({
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        } & {
            profile_uid?: string | undefined;
        }) | null;
    }) & {
        id: string;
        version: string;
    }))[] | undefined;
    extended_fields_labels?: {
        [x: string]: string;
    } | undefined;
};
export declare const decodeCaseResolveResponse: (respCase?: CaseResolveResponse) => {
    case: {
        description: string;
        tags: string[];
        title: string;
        connector: {
            id: string;
        } & (({
            type: import("../../common/types/domain").ConnectorTypes.casesWebhook;
            fields: null;
        } & {
            name: string;
        }) | ({
            type: import("../../common/types/domain").ConnectorTypes.jira;
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
            type: import("../../common/types/domain").ConnectorTypes.none;
            fields: null;
        } & {
            name: string;
        }) | ({
            type: import("../../common/types/domain").ConnectorTypes.resilient;
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
            type: import("../../common/types/domain").ConnectorTypes.serviceNowITSM;
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
            type: import("../../common/types/domain").ConnectorTypes.serviceNowSIR;
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
            type: import("../../common/types/domain").ConnectorTypes.swimlane;
            fields: {
                caseId: string | null;
            } | null;
        } & {
            name: string;
        }) | ({
            type: import("../../common/types/domain").ConnectorTypes.theHive;
            fields: {
                tlp: number | null;
            } | null;
        } & {
            name: string;
        }));
        severity: import("../../common/types/domain").CaseSeverity;
        assignees: {
            uid: string;
        }[];
        category: string | null;
        customFields: ({
            key: string;
            type: import("../../common/types/domain").CustomFieldTypes.TEXT;
            value: string | null;
        } | {
            key: string;
            type: import("../../common/types/domain").CustomFieldTypes.TOGGLE;
            value: boolean | null;
        } | {
            key: string;
            type: import("../../common/types/domain").CustomFieldTypes.NUMBER;
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
    } & {
        id: string;
        totalComment: number;
        totalAlerts: number;
        totalEvents: number | undefined;
        version: string;
    } & {
        comments?: (((({
            comment: string;
            type: AttachmentType.user;
            owner: string;
        } & {
            created_at: string;
            created_by: {
                email: string | null | undefined;
                full_name: string | null | undefined;
                username: string | null | undefined;
            } & {
                profile_uid?: string | undefined;
            };
            owner: string;
            pushed_at: string | null;
            pushed_by: ({
                email: string | null | undefined;
                full_name: string | null | undefined;
                username: string | null | undefined;
            } & {
                profile_uid?: string | undefined;
            }) | null;
            updated_at: string | null;
            updated_by: ({
                email: string | null | undefined;
                full_name: string | null | undefined;
                username: string | null | undefined;
            } & {
                profile_uid?: string | undefined;
            }) | null;
        }) | ({
            type: AttachmentType.alert;
            alertId: string | string[];
            index: string | string[];
            rule: {
                id: string | null;
                name: string | null;
            };
            owner: string;
        } & {
            created_at: string;
            created_by: {
                email: string | null | undefined;
                full_name: string | null | undefined;
                username: string | null | undefined;
            } & {
                profile_uid?: string | undefined;
            };
            owner: string;
            pushed_at: string | null;
            pushed_by: ({
                email: string | null | undefined;
                full_name: string | null | undefined;
                username: string | null | undefined;
            } & {
                profile_uid?: string | undefined;
            }) | null;
            updated_at: string | null;
            updated_by: ({
                email: string | null | undefined;
                full_name: string | null | undefined;
                username: string | null | undefined;
            } & {
                profile_uid?: string | undefined;
            }) | null;
        }) | ({
            type: AttachmentType.event;
            eventId: string | string[];
            index: string | string[];
            owner: string;
        } & {
            created_at: string;
            created_by: {
                email: string | null | undefined;
                full_name: string | null | undefined;
                username: string | null | undefined;
            } & {
                profile_uid?: string | undefined;
            };
            owner: string;
            pushed_at: string | null;
            pushed_by: ({
                email: string | null | undefined;
                full_name: string | null | undefined;
                username: string | null | undefined;
            } & {
                profile_uid?: string | undefined;
            }) | null;
            updated_at: string | null;
            updated_by: ({
                email: string | null | undefined;
                full_name: string | null | undefined;
                username: string | null | undefined;
            } & {
                profile_uid?: string | undefined;
            }) | null;
        }) | ({
            type: AttachmentType.actions;
            comment: string;
            actions: {
                targets: {
                    hostname: string;
                    endpointId: string;
                }[];
                type: string;
            };
            owner: string;
        } & {
            created_at: string;
            created_by: {
                email: string | null | undefined;
                full_name: string | null | undefined;
                username: string | null | undefined;
            } & {
                profile_uid?: string | undefined;
            };
            owner: string;
            pushed_at: string | null;
            pushed_by: ({
                email: string | null | undefined;
                full_name: string | null | undefined;
                username: string | null | undefined;
            } & {
                profile_uid?: string | undefined;
            }) | null;
            updated_at: string | null;
            updated_by: ({
                email: string | null | undefined;
                full_name: string | null | undefined;
                username: string | null | undefined;
            } & {
                profile_uid?: string | undefined;
            }) | null;
        }) | (({
            externalReferenceId: string;
            externalReferenceStorage: {
                type: import("../../common/types/domain").ExternalReferenceStorageType.elasticSearchDoc;
            };
            externalReferenceAttachmentTypeId: string;
            externalReferenceMetadata: {
                [x: string]: import("@kbn/utility-types").JsonValue;
            } | null;
            type: AttachmentType.externalReference;
            owner: string;
        } | {
            externalReferenceId: string;
            externalReferenceStorage: {
                type: import("../../common/types/domain").ExternalReferenceStorageType.savedObject;
                soType: string;
            };
            externalReferenceAttachmentTypeId: string;
            externalReferenceMetadata: {
                [x: string]: import("@kbn/utility-types").JsonValue;
            } | null;
            type: AttachmentType.externalReference;
            owner: string;
        }) & {
            created_at: string;
            created_by: {
                email: string | null | undefined;
                full_name: string | null | undefined;
                username: string | null | undefined;
            } & {
                profile_uid?: string | undefined;
            };
            owner: string;
            pushed_at: string | null;
            pushed_by: ({
                email: string | null | undefined;
                full_name: string | null | undefined;
                username: string | null | undefined;
            } & {
                profile_uid?: string | undefined;
            }) | null;
            updated_at: string | null;
            updated_by: ({
                email: string | null | undefined;
                full_name: string | null | undefined;
                username: string | null | undefined;
            } & {
                profile_uid?: string | undefined;
            }) | null;
        }) | ({
            type: AttachmentType.persistableState;
            owner: string;
            persistableStateAttachmentTypeId: string;
            persistableStateAttachmentState: {
                [x: string]: import("@kbn/utility-types").JsonValue;
            };
        } & {
            created_at: string;
            created_by: {
                email: string | null | undefined;
                full_name: string | null | undefined;
                username: string | null | undefined;
            } & {
                profile_uid?: string | undefined;
            };
            owner: string;
            pushed_at: string | null;
            pushed_by: ({
                email: string | null | undefined;
                full_name: string | null | undefined;
                username: string | null | undefined;
            } & {
                profile_uid?: string | undefined;
            }) | null;
            updated_at: string | null;
            updated_by: ({
                email: string | null | undefined;
                full_name: string | null | undefined;
                username: string | null | undefined;
            } & {
                profile_uid?: string | undefined;
            }) | null;
        })) & {
            id: string;
            version: string;
        }) | (((({
            type: string;
            attachmentId: string | string[];
            owner: string;
        } & {
            data?: {
                [x: string]: import("@kbn/utility-types").JsonValue;
            } | null | undefined;
            metadata?: {
                [x: string]: import("@kbn/utility-types").JsonValue;
            } | null | undefined;
        }) | ({
            type: string;
            data: {
                [x: string]: import("@kbn/utility-types").JsonValue;
            };
            owner: string;
        } & {
            metadata?: {
                [x: string]: import("@kbn/utility-types").JsonValue;
            } | null | undefined;
        })) & {
            created_at: string;
            created_by: {
                email: string | null | undefined;
                full_name: string | null | undefined;
                username: string | null | undefined;
            } & {
                profile_uid?: string | undefined;
            };
            owner: string;
            pushed_at: string | null;
            pushed_by: ({
                email: string | null | undefined;
                full_name: string | null | undefined;
                username: string | null | undefined;
            } & {
                profile_uid?: string | undefined;
            }) | null;
            updated_at: string | null;
            updated_by: ({
                email: string | null | undefined;
                full_name: string | null | undefined;
                username: string | null | undefined;
            } & {
                profile_uid?: string | undefined;
            }) | null;
        }) & {
            id: string;
            version: string;
        }))[] | undefined;
        extended_fields_labels?: {
            [x: string]: string;
        } | undefined;
    };
    outcome: "conflict" | "exactMatch" | "aliasMatch";
} & {
    alias_target_id?: string | undefined;
    alias_purpose?: "savedObjectConversion" | "savedObjectImport" | undefined;
};
export declare const decodeSingleCaseMetricsResponse: (respCase?: SingleCaseMetricsResponse) => {
    alerts?: {
        count?: number | undefined;
        hosts?: {
            total: number;
            values: {
                name: string | undefined;
                id: string;
                count: number;
            }[];
        } | undefined;
        users?: {
            total: number;
            values: {
                name: string;
                count: number;
            }[];
        } | undefined;
    } | undefined;
    connectors?: {
        total: number;
    } | undefined;
    actions?: {
        isolateHost?: {
            isolate: {
                total: number;
            };
            unisolate: {
                total: number;
            };
        } | undefined;
    } | undefined;
    lifespan?: {
        creationDate: string;
        closeDate: string | null;
        statusInfo: {
            openDuration: number;
            inProgressDuration: number;
            reopenDates: string[];
        };
    } | undefined;
};
export declare const decodeCasesResponse: (respCase?: Cases) => ({
    description: string;
    tags: string[];
    title: string;
    connector: {
        id: string;
    } & (({
        type: import("../../common/types/domain").ConnectorTypes.casesWebhook;
        fields: null;
    } & {
        name: string;
    }) | ({
        type: import("../../common/types/domain").ConnectorTypes.jira;
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
        type: import("../../common/types/domain").ConnectorTypes.none;
        fields: null;
    } & {
        name: string;
    }) | ({
        type: import("../../common/types/domain").ConnectorTypes.resilient;
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
        type: import("../../common/types/domain").ConnectorTypes.serviceNowITSM;
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
        type: import("../../common/types/domain").ConnectorTypes.serviceNowSIR;
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
        type: import("../../common/types/domain").ConnectorTypes.swimlane;
        fields: {
            caseId: string | null;
        } | null;
    } & {
        name: string;
    }) | ({
        type: import("../../common/types/domain").ConnectorTypes.theHive;
        fields: {
            tlp: number | null;
        } | null;
    } & {
        name: string;
    }));
    severity: import("../../common/types/domain").CaseSeverity;
    assignees: {
        uid: string;
    }[];
    category: string | null;
    customFields: ({
        key: string;
        type: import("../../common/types/domain").CustomFieldTypes.TEXT;
        value: string | null;
    } | {
        key: string;
        type: import("../../common/types/domain").CustomFieldTypes.TOGGLE;
        value: boolean | null;
    } | {
        key: string;
        type: import("../../common/types/domain").CustomFieldTypes.NUMBER;
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
} & {
    id: string;
    totalComment: number;
    totalAlerts: number;
    totalEvents: number | undefined;
    version: string;
} & {
    comments?: (((({
        comment: string;
        type: AttachmentType.user;
        owner: string;
    } & {
        created_at: string;
        created_by: {
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        } & {
            profile_uid?: string | undefined;
        };
        owner: string;
        pushed_at: string | null;
        pushed_by: ({
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        } & {
            profile_uid?: string | undefined;
        }) | null;
        updated_at: string | null;
        updated_by: ({
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        } & {
            profile_uid?: string | undefined;
        }) | null;
    }) | ({
        type: AttachmentType.alert;
        alertId: string | string[];
        index: string | string[];
        rule: {
            id: string | null;
            name: string | null;
        };
        owner: string;
    } & {
        created_at: string;
        created_by: {
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        } & {
            profile_uid?: string | undefined;
        };
        owner: string;
        pushed_at: string | null;
        pushed_by: ({
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        } & {
            profile_uid?: string | undefined;
        }) | null;
        updated_at: string | null;
        updated_by: ({
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        } & {
            profile_uid?: string | undefined;
        }) | null;
    }) | ({
        type: AttachmentType.event;
        eventId: string | string[];
        index: string | string[];
        owner: string;
    } & {
        created_at: string;
        created_by: {
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        } & {
            profile_uid?: string | undefined;
        };
        owner: string;
        pushed_at: string | null;
        pushed_by: ({
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        } & {
            profile_uid?: string | undefined;
        }) | null;
        updated_at: string | null;
        updated_by: ({
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        } & {
            profile_uid?: string | undefined;
        }) | null;
    }) | ({
        type: AttachmentType.actions;
        comment: string;
        actions: {
            targets: {
                hostname: string;
                endpointId: string;
            }[];
            type: string;
        };
        owner: string;
    } & {
        created_at: string;
        created_by: {
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        } & {
            profile_uid?: string | undefined;
        };
        owner: string;
        pushed_at: string | null;
        pushed_by: ({
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        } & {
            profile_uid?: string | undefined;
        }) | null;
        updated_at: string | null;
        updated_by: ({
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        } & {
            profile_uid?: string | undefined;
        }) | null;
    }) | (({
        externalReferenceId: string;
        externalReferenceStorage: {
            type: import("../../common/types/domain").ExternalReferenceStorageType.elasticSearchDoc;
        };
        externalReferenceAttachmentTypeId: string;
        externalReferenceMetadata: {
            [x: string]: import("@kbn/utility-types").JsonValue;
        } | null;
        type: AttachmentType.externalReference;
        owner: string;
    } | {
        externalReferenceId: string;
        externalReferenceStorage: {
            type: import("../../common/types/domain").ExternalReferenceStorageType.savedObject;
            soType: string;
        };
        externalReferenceAttachmentTypeId: string;
        externalReferenceMetadata: {
            [x: string]: import("@kbn/utility-types").JsonValue;
        } | null;
        type: AttachmentType.externalReference;
        owner: string;
    }) & {
        created_at: string;
        created_by: {
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        } & {
            profile_uid?: string | undefined;
        };
        owner: string;
        pushed_at: string | null;
        pushed_by: ({
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        } & {
            profile_uid?: string | undefined;
        }) | null;
        updated_at: string | null;
        updated_by: ({
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        } & {
            profile_uid?: string | undefined;
        }) | null;
    }) | ({
        type: AttachmentType.persistableState;
        owner: string;
        persistableStateAttachmentTypeId: string;
        persistableStateAttachmentState: {
            [x: string]: import("@kbn/utility-types").JsonValue;
        };
    } & {
        created_at: string;
        created_by: {
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        } & {
            profile_uid?: string | undefined;
        };
        owner: string;
        pushed_at: string | null;
        pushed_by: ({
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        } & {
            profile_uid?: string | undefined;
        }) | null;
        updated_at: string | null;
        updated_by: ({
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        } & {
            profile_uid?: string | undefined;
        }) | null;
    })) & {
        id: string;
        version: string;
    }) | (((({
        type: string;
        attachmentId: string | string[];
        owner: string;
    } & {
        data?: {
            [x: string]: import("@kbn/utility-types").JsonValue;
        } | null | undefined;
        metadata?: {
            [x: string]: import("@kbn/utility-types").JsonValue;
        } | null | undefined;
    }) | ({
        type: string;
        data: {
            [x: string]: import("@kbn/utility-types").JsonValue;
        };
        owner: string;
    } & {
        metadata?: {
            [x: string]: import("@kbn/utility-types").JsonValue;
        } | null | undefined;
    })) & {
        created_at: string;
        created_by: {
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        } & {
            profile_uid?: string | undefined;
        };
        owner: string;
        pushed_at: string | null;
        pushed_by: ({
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        } & {
            profile_uid?: string | undefined;
        }) | null;
        updated_at: string | null;
        updated_by: ({
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        } & {
            profile_uid?: string | undefined;
        }) | null;
    }) & {
        id: string;
        version: string;
    }))[] | undefined;
    extended_fields_labels?: {
        [x: string]: string;
    } | undefined;
})[];
export declare const decodeCasesWithUpdateSummaryResponse: (response?: CasesPatchResponse) => ({
    description: string;
    tags: string[];
    title: string;
    connector: {
        id: string;
    } & (({
        type: import("../../common/types/domain").ConnectorTypes.casesWebhook;
        fields: null;
    } & {
        name: string;
    }) | ({
        type: import("../../common/types/domain").ConnectorTypes.jira;
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
        type: import("../../common/types/domain").ConnectorTypes.none;
        fields: null;
    } & {
        name: string;
    }) | ({
        type: import("../../common/types/domain").ConnectorTypes.resilient;
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
        type: import("../../common/types/domain").ConnectorTypes.serviceNowITSM;
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
        type: import("../../common/types/domain").ConnectorTypes.serviceNowSIR;
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
        type: import("../../common/types/domain").ConnectorTypes.swimlane;
        fields: {
            caseId: string | null;
        } | null;
    } & {
        name: string;
    }) | ({
        type: import("../../common/types/domain").ConnectorTypes.theHive;
        fields: {
            tlp: number | null;
        } | null;
    } & {
        name: string;
    }));
    severity: import("../../common/types/domain").CaseSeverity;
    assignees: {
        uid: string;
    }[];
    category: string | null;
    customFields: ({
        key: string;
        type: import("../../common/types/domain").CustomFieldTypes.TEXT;
        value: string | null;
    } | {
        key: string;
        type: import("../../common/types/domain").CustomFieldTypes.TOGGLE;
        value: boolean | null;
    } | {
        key: string;
        type: import("../../common/types/domain").CustomFieldTypes.NUMBER;
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
} & {
    id: string;
    totalComment: number;
    totalAlerts: number;
    totalEvents: number | undefined;
    version: string;
} & {
    comments?: (((({
        comment: string;
        type: AttachmentType.user;
        owner: string;
    } & {
        created_at: string;
        created_by: {
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        } & {
            profile_uid?: string | undefined;
        };
        owner: string;
        pushed_at: string | null;
        pushed_by: ({
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        } & {
            profile_uid?: string | undefined;
        }) | null;
        updated_at: string | null;
        updated_by: ({
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        } & {
            profile_uid?: string | undefined;
        }) | null;
    }) | ({
        type: AttachmentType.alert;
        alertId: string | string[];
        index: string | string[];
        rule: {
            id: string | null;
            name: string | null;
        };
        owner: string;
    } & {
        created_at: string;
        created_by: {
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        } & {
            profile_uid?: string | undefined;
        };
        owner: string;
        pushed_at: string | null;
        pushed_by: ({
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        } & {
            profile_uid?: string | undefined;
        }) | null;
        updated_at: string | null;
        updated_by: ({
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        } & {
            profile_uid?: string | undefined;
        }) | null;
    }) | ({
        type: AttachmentType.event;
        eventId: string | string[];
        index: string | string[];
        owner: string;
    } & {
        created_at: string;
        created_by: {
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        } & {
            profile_uid?: string | undefined;
        };
        owner: string;
        pushed_at: string | null;
        pushed_by: ({
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        } & {
            profile_uid?: string | undefined;
        }) | null;
        updated_at: string | null;
        updated_by: ({
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        } & {
            profile_uid?: string | undefined;
        }) | null;
    }) | ({
        type: AttachmentType.actions;
        comment: string;
        actions: {
            targets: {
                hostname: string;
                endpointId: string;
            }[];
            type: string;
        };
        owner: string;
    } & {
        created_at: string;
        created_by: {
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        } & {
            profile_uid?: string | undefined;
        };
        owner: string;
        pushed_at: string | null;
        pushed_by: ({
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        } & {
            profile_uid?: string | undefined;
        }) | null;
        updated_at: string | null;
        updated_by: ({
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        } & {
            profile_uid?: string | undefined;
        }) | null;
    }) | (({
        externalReferenceId: string;
        externalReferenceStorage: {
            type: import("../../common/types/domain").ExternalReferenceStorageType.elasticSearchDoc;
        };
        externalReferenceAttachmentTypeId: string;
        externalReferenceMetadata: {
            [x: string]: import("@kbn/utility-types").JsonValue;
        } | null;
        type: AttachmentType.externalReference;
        owner: string;
    } | {
        externalReferenceId: string;
        externalReferenceStorage: {
            type: import("../../common/types/domain").ExternalReferenceStorageType.savedObject;
            soType: string;
        };
        externalReferenceAttachmentTypeId: string;
        externalReferenceMetadata: {
            [x: string]: import("@kbn/utility-types").JsonValue;
        } | null;
        type: AttachmentType.externalReference;
        owner: string;
    }) & {
        created_at: string;
        created_by: {
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        } & {
            profile_uid?: string | undefined;
        };
        owner: string;
        pushed_at: string | null;
        pushed_by: ({
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        } & {
            profile_uid?: string | undefined;
        }) | null;
        updated_at: string | null;
        updated_by: ({
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        } & {
            profile_uid?: string | undefined;
        }) | null;
    }) | ({
        type: AttachmentType.persistableState;
        owner: string;
        persistableStateAttachmentTypeId: string;
        persistableStateAttachmentState: {
            [x: string]: import("@kbn/utility-types").JsonValue;
        };
    } & {
        created_at: string;
        created_by: {
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        } & {
            profile_uid?: string | undefined;
        };
        owner: string;
        pushed_at: string | null;
        pushed_by: ({
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        } & {
            profile_uid?: string | undefined;
        }) | null;
        updated_at: string | null;
        updated_by: ({
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        } & {
            profile_uid?: string | undefined;
        }) | null;
    })) & {
        id: string;
        version: string;
    }) | (((({
        type: string;
        attachmentId: string | string[];
        owner: string;
    } & {
        data?: {
            [x: string]: import("@kbn/utility-types").JsonValue;
        } | null | undefined;
        metadata?: {
            [x: string]: import("@kbn/utility-types").JsonValue;
        } | null | undefined;
    }) | ({
        type: string;
        data: {
            [x: string]: import("@kbn/utility-types").JsonValue;
        };
        owner: string;
    } & {
        metadata?: {
            [x: string]: import("@kbn/utility-types").JsonValue;
        } | null | undefined;
    })) & {
        created_at: string;
        created_by: {
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        } & {
            profile_uid?: string | undefined;
        };
        owner: string;
        pushed_at: string | null;
        pushed_by: ({
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        } & {
            profile_uid?: string | undefined;
        }) | null;
        updated_at: string | null;
        updated_by: ({
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        } & {
            profile_uid?: string | undefined;
        }) | null;
    }) & {
        id: string;
        version: string;
    }))[] | undefined;
    extended_fields_labels?: {
        [x: string]: string;
    } | undefined;
} & {
    updateSummary?: {
        syncedAlertCount: number;
    } | undefined;
})[];
export declare const decodeCaseConfigurationsResponse: (respCase?: Configurations) => ({
    connector: {
        id: string;
    } & (({
        type: import("../../common/types/domain").ConnectorTypes.casesWebhook;
        fields: null;
    } & {
        name: string;
    }) | ({
        type: import("../../common/types/domain").ConnectorTypes.jira;
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
        type: import("../../common/types/domain").ConnectorTypes.none;
        fields: null;
    } & {
        name: string;
    }) | ({
        type: import("../../common/types/domain").ConnectorTypes.resilient;
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
        type: import("../../common/types/domain").ConnectorTypes.serviceNowITSM;
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
        type: import("../../common/types/domain").ConnectorTypes.serviceNowSIR;
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
        type: import("../../common/types/domain").ConnectorTypes.swimlane;
        fields: {
            caseId: string | null;
        } | null;
    } & {
        name: string;
    }) | ({
        type: import("../../common/types/domain").ConnectorTypes.theHive;
        fields: {
            tlp: number | null;
        } | null;
    } & {
        name: string;
    }));
    closure_type: "close-by-user" | "close-by-pushing";
    customFields: (({
        type: import("../../common/types/domain").CustomFieldTypes.TEXT;
    } & {
        key: string;
        label: string;
        required: boolean;
    } & {
        defaultValue?: string | null | undefined;
    }) | ({
        type: import("../../common/types/domain").CustomFieldTypes.TOGGLE;
    } & {
        key: string;
        label: string;
        required: boolean;
    } & {
        defaultValue?: boolean | null | undefined;
    }) | ({
        type: import("../../common/types/domain").CustomFieldTypes.NUMBER;
    } & {
        key: string;
        label: string;
        required: boolean;
    } & {
        defaultValue?: number | null | undefined;
    }))[];
    templates: ({
        key: string;
        name: string;
        caseFields: {
            description?: string | undefined;
            tags?: string[] | undefined;
            title?: string | undefined;
            connector?: ({
                id: string;
            } & (({
                type: import("../../common/types/domain").ConnectorTypes.casesWebhook;
                fields: null;
            } & {
                name: string;
            }) | ({
                type: import("../../common/types/domain").ConnectorTypes.jira;
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
                type: import("../../common/types/domain").ConnectorTypes.none;
                fields: null;
            } & {
                name: string;
            }) | ({
                type: import("../../common/types/domain").ConnectorTypes.resilient;
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
                type: import("../../common/types/domain").ConnectorTypes.serviceNowITSM;
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
                type: import("../../common/types/domain").ConnectorTypes.serviceNowSIR;
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
                type: import("../../common/types/domain").ConnectorTypes.swimlane;
                fields: {
                    caseId: string | null;
                } | null;
            } & {
                name: string;
            }) | ({
                type: import("../../common/types/domain").ConnectorTypes.theHive;
                fields: {
                    tlp: number | null;
                } | null;
            } & {
                name: string;
            }))) | undefined;
            severity?: import("../../common/types/domain").CaseSeverity | undefined;
            assignees?: {
                uid: string;
            }[] | undefined;
            category?: string | null | undefined;
            customFields?: ({
                key: string;
                type: import("../../common/types/domain").CustomFieldTypes.TEXT;
                value: string | null;
            } | {
                key: string;
                type: import("../../common/types/domain").CustomFieldTypes.TOGGLE;
                value: boolean | null;
            } | {
                key: string;
                type: import("../../common/types/domain").CustomFieldTypes.NUMBER;
                value: number | null;
            })[] | undefined;
            settings?: ({
                syncAlerts: boolean;
            } & {
                extractObservables?: boolean | undefined;
            }) | undefined;
            observables?: ({
                id: string;
                createdAt: string;
                updatedAt: string | null;
            } & {
                typeKey: string;
                value: string;
                description: string | null;
            })[] | undefined;
        } | null;
    } & {
        description?: string | undefined;
        tags?: string[] | undefined;
    })[];
    observableTypes: {
        key: string;
        label: string;
    }[];
} & {
    owner: string;
} & {
    created_at: string;
    created_by: {
        email: string | null | undefined;
        full_name: string | null | undefined;
        username: string | null | undefined;
    } & {
        profile_uid?: string | undefined;
    };
    updated_at: string | null;
    updated_by: ({
        email: string | null | undefined;
        full_name: string | null | undefined;
        username: string | null | undefined;
    } & {
        profile_uid?: string | undefined;
    }) | null;
} & {
    id: string;
    version: string;
    error: string | null;
    owner: string;
    mappings: {
        action_type: "append" | "overwrite" | "nothing";
        source: "tags" | "description" | "title" | "comments";
        target: string;
    }[];
})[];
export declare const decodeCaseConfigureResponse: (respCase?: Configuration) => {
    connector: {
        id: string;
    } & (({
        type: import("../../common/types/domain").ConnectorTypes.casesWebhook;
        fields: null;
    } & {
        name: string;
    }) | ({
        type: import("../../common/types/domain").ConnectorTypes.jira;
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
        type: import("../../common/types/domain").ConnectorTypes.none;
        fields: null;
    } & {
        name: string;
    }) | ({
        type: import("../../common/types/domain").ConnectorTypes.resilient;
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
        type: import("../../common/types/domain").ConnectorTypes.serviceNowITSM;
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
        type: import("../../common/types/domain").ConnectorTypes.serviceNowSIR;
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
        type: import("../../common/types/domain").ConnectorTypes.swimlane;
        fields: {
            caseId: string | null;
        } | null;
    } & {
        name: string;
    }) | ({
        type: import("../../common/types/domain").ConnectorTypes.theHive;
        fields: {
            tlp: number | null;
        } | null;
    } & {
        name: string;
    }));
    closure_type: "close-by-user" | "close-by-pushing";
    customFields: (({
        type: import("../../common/types/domain").CustomFieldTypes.TEXT;
    } & {
        key: string;
        label: string;
        required: boolean;
    } & {
        defaultValue?: string | null | undefined;
    }) | ({
        type: import("../../common/types/domain").CustomFieldTypes.TOGGLE;
    } & {
        key: string;
        label: string;
        required: boolean;
    } & {
        defaultValue?: boolean | null | undefined;
    }) | ({
        type: import("../../common/types/domain").CustomFieldTypes.NUMBER;
    } & {
        key: string;
        label: string;
        required: boolean;
    } & {
        defaultValue?: number | null | undefined;
    }))[];
    templates: ({
        key: string;
        name: string;
        caseFields: {
            description?: string | undefined;
            tags?: string[] | undefined;
            title?: string | undefined;
            connector?: ({
                id: string;
            } & (({
                type: import("../../common/types/domain").ConnectorTypes.casesWebhook;
                fields: null;
            } & {
                name: string;
            }) | ({
                type: import("../../common/types/domain").ConnectorTypes.jira;
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
                type: import("../../common/types/domain").ConnectorTypes.none;
                fields: null;
            } & {
                name: string;
            }) | ({
                type: import("../../common/types/domain").ConnectorTypes.resilient;
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
                type: import("../../common/types/domain").ConnectorTypes.serviceNowITSM;
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
                type: import("../../common/types/domain").ConnectorTypes.serviceNowSIR;
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
                type: import("../../common/types/domain").ConnectorTypes.swimlane;
                fields: {
                    caseId: string | null;
                } | null;
            } & {
                name: string;
            }) | ({
                type: import("../../common/types/domain").ConnectorTypes.theHive;
                fields: {
                    tlp: number | null;
                } | null;
            } & {
                name: string;
            }))) | undefined;
            severity?: import("../../common/types/domain").CaseSeverity | undefined;
            assignees?: {
                uid: string;
            }[] | undefined;
            category?: string | null | undefined;
            customFields?: ({
                key: string;
                type: import("../../common/types/domain").CustomFieldTypes.TEXT;
                value: string | null;
            } | {
                key: string;
                type: import("../../common/types/domain").CustomFieldTypes.TOGGLE;
                value: boolean | null;
            } | {
                key: string;
                type: import("../../common/types/domain").CustomFieldTypes.NUMBER;
                value: number | null;
            })[] | undefined;
            settings?: ({
                syncAlerts: boolean;
            } & {
                extractObservables?: boolean | undefined;
            }) | undefined;
            observables?: ({
                id: string;
                createdAt: string;
                updatedAt: string | null;
            } & {
                typeKey: string;
                value: string;
                description: string | null;
            })[] | undefined;
        } | null;
    } & {
        description?: string | undefined;
        tags?: string[] | undefined;
    })[];
    observableTypes: {
        key: string;
        label: string;
    }[];
} & {
    owner: string;
} & {
    created_at: string;
    created_by: {
        email: string | null | undefined;
        full_name: string | null | undefined;
        username: string | null | undefined;
    } & {
        profile_uid?: string | undefined;
    };
    updated_at: string | null;
    updated_by: ({
        email: string | null | undefined;
        full_name: string | null | undefined;
        username: string | null | undefined;
    } & {
        profile_uid?: string | undefined;
    }) | null;
} & {
    id: string;
    version: string;
    error: string | null;
    owner: string;
    mappings: {
        action_type: "append" | "overwrite" | "nothing";
        source: "tags" | "description" | "title" | "comments";
        target: string;
    }[];
};
export declare const decodeCaseUserActionsResponse: (respUserActions?: UserActions) => (((({
    type: "description";
    payload: {
        description: string;
    };
} | {
    type: "tags";
    payload: {
        tags: string[];
    };
} | {
    type: "title";
    payload: {
        title: string;
    };
} | {
    type: "settings";
    payload: {
        settings: {
            syncAlerts?: boolean | undefined;
            extractObservables?: boolean | undefined;
        };
    };
} | {
    type: "status";
    payload: {
        status: import("@kbn/cases-components/src/status/types").CaseStatuses;
    } & {
        closeReason?: string | undefined;
        syncedAlertCount?: number | undefined;
    };
} | {
    type: "severity";
    payload: {
        severity: import("../../common/types/domain").CaseSeverity;
    };
} | {
    type: "assignees";
    payload: {
        assignees: {
            uid: string;
        }[];
    };
} | {
    type: "delete_case";
    payload: {};
} | {
    type: "category";
    payload: {
        category: string | null;
    };
} | {
    type: "customFields";
    payload: {
        customFields: ({
            key: string;
            type: import("../../common/types/domain").CustomFieldTypes.TEXT;
            value: string | null;
        } | {
            key: string;
            type: import("../../common/types/domain").CustomFieldTypes.TOGGLE;
            value: boolean | null;
        } | {
            key: string;
            type: import("../../common/types/domain").CustomFieldTypes.NUMBER;
            value: number | null;
        })[];
    };
} | {
    type: "observables";
    payload: {
        observables: {
            count: number;
            actionType: "update" | "delete" | "add";
        };
    };
} | {
    type: "extended_fields";
    payload: {
        extended_fields: {
            [x: string]: string;
        };
    };
} | {
    type: "template";
    payload: {
        template: {
            id: string;
            version: number;
        } | null;
    };
} | {
    type: "comment";
    payload: {
        comment: {
            type: AttachmentType.alert;
            alertId: string | string[];
            index: string | string[];
            rule: {
                id: string | null;
                name: string | null;
            };
            owner: string;
        } | {
            type: AttachmentType.event;
            eventId: string | string[];
            index: string | string[];
            owner: string;
        } | {
            externalReferenceId: string;
            externalReferenceStorage: {
                type: import("../../common/types/domain").ExternalReferenceStorageType.elasticSearchDoc;
            };
            externalReferenceAttachmentTypeId: string;
            externalReferenceMetadata: {
                [x: string]: import("@kbn/utility-types").JsonValue;
            } | null;
            type: AttachmentType.externalReference;
            owner: string;
        } | {
            externalReferenceId: string;
            externalReferenceStorage: {
                type: import("../../common/types/domain").ExternalReferenceStorageType.savedObject;
                soType: string;
            };
            externalReferenceAttachmentTypeId: string;
            externalReferenceMetadata: {
                [x: string]: import("@kbn/utility-types").JsonValue;
            } | null;
            type: AttachmentType.externalReference;
            owner: string;
        } | {
            type: AttachmentType.persistableState;
            owner: string;
            persistableStateAttachmentTypeId: string;
            persistableStateAttachmentState: {
                [x: string]: import("@kbn/utility-types").JsonValue;
            };
        } | ({
            type: string;
            attachmentId: string | string[];
            owner: string;
        } & {
            data?: {
                [x: string]: import("@kbn/utility-types").JsonValue;
            } | null | undefined;
            metadata?: {
                [x: string]: import("@kbn/utility-types").JsonValue;
            } | null | undefined;
        }) | ({
            type: string;
            data: {
                [x: string]: import("@kbn/utility-types").JsonValue;
            };
            owner: string;
        } & {
            metadata?: {
                [x: string]: import("@kbn/utility-types").JsonValue;
            } | null | undefined;
        }) | {
            comment: string;
            type: AttachmentType.user;
            owner: string;
        } | {
            type: AttachmentType.actions;
            comment: string;
            actions: {
                targets: {
                    hostname: string;
                    endpointId: string;
                }[];
                type: string;
            };
            owner: string;
        };
    };
} | ({
    type: "create_case";
} & {
    payload: {
        connector: {
            id: string;
        } & (({
            type: import("../../common/types/domain").ConnectorTypes.casesWebhook;
            fields: null;
        } & {
            name: string;
        }) | ({
            type: import("../../common/types/domain").ConnectorTypes.jira;
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
            type: import("../../common/types/domain").ConnectorTypes.none;
            fields: null;
        } & {
            name: string;
        }) | ({
            type: import("../../common/types/domain").ConnectorTypes.resilient;
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
            type: import("../../common/types/domain").ConnectorTypes.serviceNowITSM;
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
            type: import("../../common/types/domain").ConnectorTypes.serviceNowSIR;
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
            type: import("../../common/types/domain").ConnectorTypes.swimlane;
            fields: {
                caseId: string | null;
            } | null;
        } & {
            name: string;
        }) | ({
            type: import("../../common/types/domain").ConnectorTypes.theHive;
            fields: {
                tlp: number | null;
            } | null;
        } & {
            name: string;
        }));
    } & {
        assignees: {
            uid: string;
        }[];
        description: string;
        status: string;
        severity: string;
        tags: string[];
        title: string;
        settings: {
            syncAlerts?: boolean | undefined;
            extractObservables?: boolean | undefined;
        };
        owner: string;
    } & {
        category?: string | null | undefined;
        customFields?: ({
            key: string;
            type: import("../../common/types/domain").CustomFieldTypes.TEXT;
            value: string | null;
        } | {
            key: string;
            type: import("../../common/types/domain").CustomFieldTypes.TOGGLE;
            value: boolean | null;
        } | {
            key: string;
            type: import("../../common/types/domain").CustomFieldTypes.NUMBER;
            value: number | null;
        })[] | undefined;
    };
}) | {
    type: "connector";
    payload: {
        connector: {
            id: string;
        } & (({
            type: import("../../common/types/domain").ConnectorTypes.casesWebhook;
            fields: null;
        } & {
            name: string;
        }) | ({
            type: import("../../common/types/domain").ConnectorTypes.jira;
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
            type: import("../../common/types/domain").ConnectorTypes.none;
            fields: null;
        } & {
            name: string;
        }) | ({
            type: import("../../common/types/domain").ConnectorTypes.resilient;
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
            type: import("../../common/types/domain").ConnectorTypes.serviceNowITSM;
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
            type: import("../../common/types/domain").ConnectorTypes.serviceNowSIR;
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
            type: import("../../common/types/domain").ConnectorTypes.swimlane;
            fields: {
                caseId: string | null;
            } | null;
        } & {
            name: string;
        }) | ({
            type: import("../../common/types/domain").ConnectorTypes.theHive;
            fields: {
                tlp: number | null;
            } | null;
        } & {
            name: string;
        }));
    };
} | {
    type: "pushed";
    payload: {
        externalService: {
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
        };
    };
}) & {
    created_at: string;
    created_by: {
        email: string | null | undefined;
        full_name: string | null | undefined;
        username: string | null | undefined;
    } & {
        profile_uid?: string | undefined;
    };
    owner: string;
    action: "update" | "create" | "delete" | "add" | "push_to_service";
}) & {
    comment_id: string | null;
}) & {
    id: string;
    version: string;
})[];
export declare const decodeCaseUserActionStatsResponse: (caseUserActionsStats: CaseUserActionStatsResponse) => {
    total: number;
    total_deletions: number;
    total_comments: number;
    total_comment_deletions: number;
    total_comment_creations: number;
    total_hidden_comment_updates: number;
    total_other_actions: number;
    total_other_action_deletions: number;
};
export declare const decodeFindAllAttachedAlertsResponse: (respCase?: FindCasesContainingAllAlertsResponse) => {
    casesWithAllAttachments: string[];
};
export declare const valueToUpdateIsSettings: (key: UpdateByKey["updateKey"], value: UpdateByKey["updateValue"]) => value is CasePatchRequest["settings"];
export declare const valueToUpdateIsStatus: (key: UpdateByKey["updateKey"], value: UpdateByKey["updateValue"]) => value is CasePatchRequest["status"];
export declare class ToasterError extends Error {
    readonly messages: string[];
    constructor(messages: string[]);
}
export declare const createUpdateSuccessToaster: (caseBeforeUpdate: CaseUI, caseAfterUpdate: CaseUI, key: UpdateByKey["updateKey"], value: UpdateByKey["updateValue"]) => ToastInputFields;
export declare const constructAssigneesFilter: (assignees: FilterOptions["assignees"]) => {
    assignees?: string | string[];
};
export declare const constructReportersFilter: (reporters: User[]) => {
    reporters: string[];
} | {
    reporters?: undefined;
};
export declare const constructCustomFieldsFilter: (optionKeysByCustomFieldKey: FilterOptions["customFields"]) => {
    customFields?: undefined;
} | {
    customFields: {
        [x: string]: (boolean | null)[];
    };
};
export interface ParsedExtendedFieldSearch {
    extendedFieldFilters: ExtendedFieldFilter[];
    freeText: string;
}
/**
 * Parses a search string to extract field:value pairs for extended field filtering.
 *
 * Label syntax:
 * - Single-word label:  `priority:high`
 * - Multi-word label:   `"Effort Level":high`  (quoted label)
 *
 * Value syntax:
 * - Unquoted value:     `priority:high`
 * - Quoted value:       `notes:"value:with:colons"` (colons inside quotes are not separators)
 *
 * Multiple pairs: `priority:high region:emea` -> AND semantics
 * Mixed with free text: `priority:high some text` -> filter + free text "some text"
 */
export declare const parseExtendedFieldSearch: (search: string) => ParsedExtendedFieldSearch;
export declare const getIncrementalIdSearchOverrides: (search: string) => Partial<FilterOptions>;
