import type { CasesFindResponse, CasesBulkGetResponse, CasesMetricsResponse, CasesSimilarResponse } from '../../common/types/api';
export declare const decodeCasesFindResponse: (respCases?: CasesFindResponse) => {
    cases: ({
        description: string;
        tags: string[];
        title: string;
        connector: {
            id: string;
        } & (({
            type: import("../../common").ConnectorTypes.casesWebhook;
            fields: null;
        } & {
            name: string;
        }) | ({
            type: import("../../common").ConnectorTypes.jira;
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
            type: import("../../common").ConnectorTypes.none;
            fields: null;
        } & {
            name: string;
        }) | ({
            type: import("../../common").ConnectorTypes.resilient;
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
            type: import("../../common").ConnectorTypes.serviceNowITSM;
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
            type: import("../../common").ConnectorTypes.serviceNowSIR;
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
            type: import("../../common").ConnectorTypes.swimlane;
            fields: {
                caseId: string | null;
            } | null;
        } & {
            name: string;
        }) | ({
            type: import("../../common").ConnectorTypes.theHive;
            fields: {
                tlp: number | null;
            } | null;
        } & {
            name: string;
        }));
        severity: import("../../common").CaseSeverity;
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
        status: import("@kbn/cases-components").CaseStatuses;
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
            type: import("../../common").AttachmentType.user;
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
            type: import("../../common").AttachmentType.alert;
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
            type: import("../../common").AttachmentType.event;
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
            type: import("../../common").AttachmentType.actions;
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
                type: import("../../common").ExternalReferenceStorageType.elasticSearchDoc;
            };
            externalReferenceAttachmentTypeId: string;
            externalReferenceMetadata: {
                [x: string]: import("@kbn/utility-types").JsonValue;
            } | null;
            type: import("../../common").AttachmentType.externalReference;
            owner: string;
        } | {
            externalReferenceId: string;
            externalReferenceStorage: {
                type: import("../../common").ExternalReferenceStorageType.savedObject;
                soType: string;
            };
            externalReferenceAttachmentTypeId: string;
            externalReferenceMetadata: {
                [x: string]: import("@kbn/utility-types").JsonValue;
            } | null;
            type: import("../../common").AttachmentType.externalReference;
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
            type: import("../../common").AttachmentType.persistableState;
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
    page: number;
    per_page: number;
    total: number;
} & {
    count_open_cases: number;
    count_in_progress_cases: number;
    count_closed_cases: number;
};
export declare const decodeCasesMetricsResponse: (metrics?: CasesMetricsResponse) => {
    mttr?: number | null | undefined;
    status?: {
        open: number;
        inProgress: number;
        closed: number;
    } | undefined;
};
export declare const decodeCasesBulkGetResponse: (res: CasesBulkGetResponse) => {
    cases: ({
        description: string;
        tags: string[];
        title: string;
        connector: {
            id: string;
        } & (({
            type: import("../../common").ConnectorTypes.casesWebhook;
            fields: null;
        } & {
            name: string;
        }) | ({
            type: import("../../common").ConnectorTypes.jira;
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
            type: import("../../common").ConnectorTypes.none;
            fields: null;
        } & {
            name: string;
        }) | ({
            type: import("../../common").ConnectorTypes.resilient;
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
            type: import("../../common").ConnectorTypes.serviceNowITSM;
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
            type: import("../../common").ConnectorTypes.serviceNowSIR;
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
            type: import("../../common").ConnectorTypes.swimlane;
            fields: {
                caseId: string | null;
            } | null;
        } & {
            name: string;
        }) | ({
            type: import("../../common").ConnectorTypes.theHive;
            fields: {
                tlp: number | null;
            } | null;
        } & {
            name: string;
        }));
        severity: import("../../common").CaseSeverity;
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
        status: import("@kbn/cases-components").CaseStatuses;
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
            type: import("../../common").AttachmentType.user;
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
            type: import("../../common").AttachmentType.alert;
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
            type: import("../../common").AttachmentType.event;
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
            type: import("../../common").AttachmentType.actions;
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
                type: import("../../common").ExternalReferenceStorageType.elasticSearchDoc;
            };
            externalReferenceAttachmentTypeId: string;
            externalReferenceMetadata: {
                [x: string]: import("@kbn/utility-types").JsonValue;
            } | null;
            type: import("../../common").AttachmentType.externalReference;
            owner: string;
        } | {
            externalReferenceId: string;
            externalReferenceStorage: {
                type: import("../../common").ExternalReferenceStorageType.savedObject;
                soType: string;
            };
            externalReferenceAttachmentTypeId: string;
            externalReferenceMetadata: {
                [x: string]: import("@kbn/utility-types").JsonValue;
            } | null;
            type: import("../../common").AttachmentType.externalReference;
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
            type: import("../../common").AttachmentType.persistableState;
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
    errors: {
        error: string;
        message: string;
        status: number | undefined;
        caseId: string;
    }[];
};
export declare const decodeCasesSimilarResponse: (respCases?: CasesSimilarResponse) => {
    cases: ({
        description: string;
        tags: string[];
        title: string;
        connector: {
            id: string;
        } & (({
            type: import("../../common").ConnectorTypes.casesWebhook;
            fields: null;
        } & {
            name: string;
        }) | ({
            type: import("../../common").ConnectorTypes.jira;
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
            type: import("../../common").ConnectorTypes.none;
            fields: null;
        } & {
            name: string;
        }) | ({
            type: import("../../common").ConnectorTypes.resilient;
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
            type: import("../../common").ConnectorTypes.serviceNowITSM;
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
            type: import("../../common").ConnectorTypes.serviceNowSIR;
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
            type: import("../../common").ConnectorTypes.swimlane;
            fields: {
                caseId: string | null;
            } | null;
        } & {
            name: string;
        }) | ({
            type: import("../../common").ConnectorTypes.theHive;
            fields: {
                tlp: number | null;
            } | null;
        } & {
            name: string;
        }));
        severity: import("../../common").CaseSeverity;
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
        status: import("@kbn/cases-components").CaseStatuses;
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
            type: import("../../common").AttachmentType.user;
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
            type: import("../../common").AttachmentType.alert;
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
            type: import("../../common").AttachmentType.event;
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
            type: import("../../common").AttachmentType.actions;
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
                type: import("../../common").ExternalReferenceStorageType.elasticSearchDoc;
            };
            externalReferenceAttachmentTypeId: string;
            externalReferenceMetadata: {
                [x: string]: import("@kbn/utility-types").JsonValue;
            } | null;
            type: import("../../common").AttachmentType.externalReference;
            owner: string;
        } | {
            externalReferenceId: string;
            externalReferenceStorage: {
                type: import("../../common").ExternalReferenceStorageType.savedObject;
                soType: string;
            };
            externalReferenceAttachmentTypeId: string;
            externalReferenceMetadata: {
                [x: string]: import("@kbn/utility-types").JsonValue;
            } | null;
            type: import("../../common").AttachmentType.externalReference;
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
            type: import("../../common").AttachmentType.persistableState;
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
        similarities: {
            observables: {
                typeKey: string;
                typeLabel: string;
                value: string;
            }[];
        };
    })[];
    page: number;
    per_page: number;
    total: number;
};
