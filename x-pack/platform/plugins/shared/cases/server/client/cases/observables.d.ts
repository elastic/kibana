import { type AddObservableRequest, type UpdateObservableRequest, type BulkAddObservablesRequest } from '../../../common/types/api';
import type { CasesClient } from '../client';
import type { CasesClientArgs } from '../types';
export declare const addObservable: (caseId: string, params: AddObservableRequest, clientArgs: CasesClientArgs, casesClient: CasesClient) => Promise<{
    description: string;
    tags: string[];
    title: string;
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
    severity: import("../../../common/types/domain").CaseSeverity;
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
} & {
    id: string;
    totalComment: number;
    totalAlerts: number;
    totalEvents: number | undefined;
    version: string;
} & {
    comments?: (((({
        comment: string;
        type: import("../../../common/types/domain").AttachmentType.user;
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
        type: import("../../../common/types/domain").AttachmentType.alert;
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
        type: import("../../../common/types/domain").AttachmentType.event;
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
        type: import("../../../common/types/domain").AttachmentType.actions;
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
            type: import("../../../common/types/domain").ExternalReferenceStorageType.elasticSearchDoc;
        };
        externalReferenceAttachmentTypeId: string;
        externalReferenceMetadata: {
            [x: string]: import("@kbn/utility-types").JsonValue;
        } | null;
        type: import("../../../common/types/domain").AttachmentType.externalReference;
        owner: string;
    } | {
        externalReferenceId: string;
        externalReferenceStorage: {
            type: import("../../../common/types/domain").ExternalReferenceStorageType.savedObject;
            soType: string;
        };
        externalReferenceAttachmentTypeId: string;
        externalReferenceMetadata: {
            [x: string]: import("@kbn/utility-types").JsonValue;
        } | null;
        type: import("../../../common/types/domain").AttachmentType.externalReference;
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
        type: import("../../../common/types/domain").AttachmentType.persistableState;
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
}>;
export declare const updateObservable: (caseId: string, observableId: string, params: UpdateObservableRequest, clientArgs: CasesClientArgs, casesClient: CasesClient) => Promise<{
    description: string;
    tags: string[];
    title: string;
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
    severity: import("../../../common/types/domain").CaseSeverity;
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
} & {
    id: string;
    totalComment: number;
    totalAlerts: number;
    totalEvents: number | undefined;
    version: string;
} & {
    comments?: (((({
        comment: string;
        type: import("../../../common/types/domain").AttachmentType.user;
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
        type: import("../../../common/types/domain").AttachmentType.alert;
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
        type: import("../../../common/types/domain").AttachmentType.event;
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
        type: import("../../../common/types/domain").AttachmentType.actions;
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
            type: import("../../../common/types/domain").ExternalReferenceStorageType.elasticSearchDoc;
        };
        externalReferenceAttachmentTypeId: string;
        externalReferenceMetadata: {
            [x: string]: import("@kbn/utility-types").JsonValue;
        } | null;
        type: import("../../../common/types/domain").AttachmentType.externalReference;
        owner: string;
    } | {
        externalReferenceId: string;
        externalReferenceStorage: {
            type: import("../../../common/types/domain").ExternalReferenceStorageType.savedObject;
            soType: string;
        };
        externalReferenceAttachmentTypeId: string;
        externalReferenceMetadata: {
            [x: string]: import("@kbn/utility-types").JsonValue;
        } | null;
        type: import("../../../common/types/domain").AttachmentType.externalReference;
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
        type: import("../../../common/types/domain").AttachmentType.persistableState;
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
}>;
export declare const deleteObservable: (caseId: string, observableId: string, clientArgs: CasesClientArgs, casesClient: CasesClient) => Promise<void>;
export declare const bulkAddObservables: (params: BulkAddObservablesRequest, clientArgs: CasesClientArgs, casesClient: CasesClient) => Promise<{
    description: string;
    tags: string[];
    title: string;
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
    severity: import("../../../common/types/domain").CaseSeverity;
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
} & {
    id: string;
    totalComment: number;
    totalAlerts: number;
    totalEvents: number | undefined;
    version: string;
} & {
    comments?: (((({
        comment: string;
        type: import("../../../common/types/domain").AttachmentType.user;
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
        type: import("../../../common/types/domain").AttachmentType.alert;
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
        type: import("../../../common/types/domain").AttachmentType.event;
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
        type: import("../../../common/types/domain").AttachmentType.actions;
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
            type: import("../../../common/types/domain").ExternalReferenceStorageType.elasticSearchDoc;
        };
        externalReferenceAttachmentTypeId: string;
        externalReferenceMetadata: {
            [x: string]: import("@kbn/utility-types").JsonValue;
        } | null;
        type: import("../../../common/types/domain").AttachmentType.externalReference;
        owner: string;
    } | {
        externalReferenceId: string;
        externalReferenceStorage: {
            type: import("../../../common/types/domain").ExternalReferenceStorageType.savedObject;
            soType: string;
        };
        externalReferenceAttachmentTypeId: string;
        externalReferenceMetadata: {
            [x: string]: import("@kbn/utility-types").JsonValue;
        } | null;
        type: import("../../../common/types/domain").AttachmentType.externalReference;
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
        type: import("../../../common/types/domain").AttachmentType.persistableState;
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
}>;
