import type { KibanaRequest } from '@kbn/core/server';
import type { z } from '@kbn/zod/v4';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import type { CasesClient } from '../../client';
import type { CreateCaseStepOutput } from '../../../common/workflows/steps/create_case';
import type { UpdateCaseStepInput } from '../../../common/workflows/steps/update_case';
type WorkflowStepCaseResult = CreateCaseStepOutput['case'];
type WorkflowUpdatePayload = UpdateCaseStepInput['updates'];
interface PushableCase {
    id: string;
    connector: {
        id: string;
    };
}
export declare const normalizeCaseStepUpdatesForBulkPatch: (updates: WorkflowUpdatePayload) => {
    connector?: {
        fields: string | null;
        id: string;
        name: string;
        type: ".none";
    } | {
        fields: string | null;
        id: string;
        name: string;
        type: ".cases-webhook";
    } | {
        fields: {
            issueType: string | null;
            parent: string | null;
            priority: string | null;
        };
        id: string;
        name: string;
        type: ".jira";
    } | {
        fields: {
            issueTypes: string[];
            severityCode: string;
        } | null;
        id: string;
        name: string;
        type: ".resilient";
    } | {
        fields: {
            category: string | null;
            impact: string | null;
            severity: string | null;
            subcategory: string | null;
            urgency: string | null;
        };
        id: string;
        name: string;
        type: ".servicenow";
    } | {
        fields: {
            category: string | null;
            destIp: boolean | null;
            malwareHash: boolean | null;
            malwareUrl: boolean | null;
            priority: string | null;
            sourceIp: boolean | null;
            subcategory: string | null;
        };
        id: string;
        name: string;
        type: ".servicenow-sir";
    } | {
        fields: {
            caseId: string | null;
        };
        id: string;
        name: string;
        type: ".swimlane";
    } | undefined;
    assignees?: {
        uid: string;
    }[] | undefined;
    tags?: string[] | undefined;
    status?: "closed" | "open" | "in-progress" | undefined;
    description?: string | undefined;
    settings?: {
        syncAlerts: boolean;
        extractObservables?: boolean | undefined;
    } | undefined;
    title?: string | undefined;
    severity?: "critical" | "medium" | "high" | "low" | undefined;
    category?: string | undefined;
    customFields?: {
        key: string;
        type: "text" | "toggle";
        value: string | boolean | null;
    }[] | undefined;
    closeReason?: string | undefined;
};
export declare function getCasesClientFromStepsContext(context: StepHandlerContext, getCasesClient: (request: KibanaRequest) => Promise<CasesClient>): Promise<CasesClient>;
export declare const withCaseOwner: <T>(client: CasesClient, caseId: string, operation: (owner: string) => Promise<T>) => Promise<T>;
export declare const pushCase: (casesClient: CasesClient, theCase: PushableCase) => Promise<{
    description: string;
    tags: string[];
    title: string;
    connector: {
        id: string;
    } & (({
        type: import("../../../common").ConnectorTypes.casesWebhook;
        fields: null;
    } & {
        name: string;
    }) | ({
        type: import("../../../common").ConnectorTypes.jira;
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
        type: import("../../../common").ConnectorTypes.none;
        fields: null;
    } & {
        name: string;
    }) | ({
        type: import("../../../common").ConnectorTypes.resilient;
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
        type: import("../../../common").ConnectorTypes.serviceNowITSM;
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
        type: import("../../../common").ConnectorTypes.serviceNowSIR;
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
        type: import("../../../common").ConnectorTypes.swimlane;
        fields: {
            caseId: string | null;
        } | null;
    } & {
        name: string;
    }) | ({
        type: import("../../../common").ConnectorTypes.theHive;
        fields: {
            tlp: number | null;
        } | null;
    } & {
        name: string;
    }));
    severity: import("../../../common").CaseSeverity;
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
        type: import("../../../common").AttachmentType.user;
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
        type: import("../../../common").AttachmentType.alert;
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
        type: import("../../../common").AttachmentType.event;
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
        type: import("../../../common").AttachmentType.actions;
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
            type: import("../../../common").ExternalReferenceStorageType.elasticSearchDoc;
        };
        externalReferenceAttachmentTypeId: string;
        externalReferenceMetadata: {
            [x: string]: import("@kbn/utility-types").JsonValue;
        } | null;
        type: import("../../../common").AttachmentType.externalReference;
        owner: string;
    } | {
        externalReferenceId: string;
        externalReferenceStorage: {
            type: import("../../../common").ExternalReferenceStorageType.savedObject;
            soType: string;
        };
        externalReferenceAttachmentTypeId: string;
        externalReferenceMetadata: {
            [x: string]: import("@kbn/utility-types").JsonValue;
        } | null;
        type: import("../../../common").AttachmentType.externalReference;
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
        type: import("../../../common").AttachmentType.persistableState;
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
export declare const getErrorMessage: (error: unknown) => string;
/**
 * Safe parsing strategy for case outputs in workflow steps:
 */
export declare const safeParseCaseForWorkflowOutput: <TCaseSchema extends z.ZodType>(caseSchema: TCaseSchema, outputCase: unknown) => z.infer<TCaseSchema>;
/**
 * Creates a standardized handler for cases workflow steps.
 */
export declare function createCasesStepHandler<TInput = unknown, TConfig = unknown, TOutputCase extends WorkflowStepCaseResult = WorkflowStepCaseResult>(getCasesClient: (request: KibanaRequest) => Promise<CasesClient>, operation: (client: CasesClient, input: TInput, config: TConfig) => Promise<TOutputCase>, options?: {
    onError?: (error: unknown, input: TInput, config: TConfig) => Error;
}): (context: StepHandlerContext) => Promise<{
    output: {
        case: TOutputCase;
    };
    error?: undefined;
} | {
    error: any;
    output?: undefined;
}>;
export {};
