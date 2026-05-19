import type { KibanaRequest } from '@kbn/core/server';
import type { UpdateCaseStepInput } from '../../../common/workflows/steps/update_case';
import type { CasesClient } from '../../client';
type WorkflowUpdatePayload = UpdateCaseStepInput['updates'];
interface UpdateSingleCaseParams {
    caseId: string;
    version?: string;
    updates: WorkflowUpdatePayload;
}
interface PrepareCasePatchParams {
    caseId: string;
    version?: string;
    updates: WorkflowUpdatePayload;
}
interface CaseIdVersionInput {
    case_id: string;
    version?: string;
}
export declare const resolveCaseVersion: (client: CasesClient, caseId: string, version?: string) => Promise<string>;
export declare const prepareCasePatch: (client: CasesClient, { caseId, version, updates }: PrepareCasePatchParams) => Promise<{
    description?: string | undefined;
    tags?: string[] | undefined;
    title?: string | undefined;
    connector?: ({
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
    }))) | undefined;
    severity?: import("../../../common").CaseSeverity | undefined;
    assignees?: {
        uid: string;
    }[] | undefined;
    category?: string | null | undefined;
    customFields?: ({
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
    })[] | undefined;
    settings?: ({
        syncAlerts: boolean;
    } & {
        extractObservables?: boolean | undefined;
    }) | undefined;
    template?: {
        id: string;
        version: number;
    } | null | undefined;
    extended_fields?: {
        [x: string]: string;
    } | undefined;
    closeReason?: string | undefined;
} & {
    status?: import("@kbn/cases-components").CaseStatuses | undefined;
    owner?: string | undefined;
} & {
    id: string;
    version: string;
}>;
export declare const updateSingleCase: (client: CasesClient, { caseId, version, updates }: UpdateSingleCaseParams) => Promise<{
    closed_at: string | null;
    closed_by: {
        email: string | null;
        full_name: string | null;
        username: string | null;
        profile_uid?: string | undefined;
    } | null;
    comments: ({
        type: "alert";
        alertId?: string[] | undefined;
        created_at?: string | undefined;
        created_by?: {
            email: string | null;
            full_name: string | null;
            username: string | null;
            profile_uid?: string | undefined;
        } | undefined;
        id?: string | undefined;
        index?: string[] | undefined;
        owner?: "cases" | "observability" | "securitySolution" | undefined;
        pushed_at?: string | null | undefined;
        pushed_by?: {
            email: string | null;
            full_name: string | null;
            username: string | null;
            profile_uid?: string | undefined;
        } | null | undefined;
        rule?: {
            id?: string | null | undefined;
            name?: string | null | undefined;
        } | undefined;
        updated_at?: string | null | undefined;
        updated_by?: {
            email: string | null;
            full_name: string | null;
            username: string | null;
            profile_uid?: string | undefined;
        } | null | undefined;
        version?: string | undefined;
    } | {
        type: "event";
        created_at?: string | undefined;
        created_by?: {
            email: string | null;
            full_name: string | null;
            username: string | null;
            profile_uid?: string | undefined;
        } | undefined;
        eventId?: string[] | undefined;
        id?: string | undefined;
        index?: string[] | undefined;
        owner?: "cases" | "observability" | "securitySolution" | undefined;
        pushed_at?: string | null | undefined;
        pushed_by?: {
            email: string | null;
            full_name: string | null;
            username: string | null;
            profile_uid?: string | undefined;
        } | null | undefined;
        updated_at?: string | null | undefined;
        updated_by?: {
            email: string | null;
            full_name: string | null;
            username: string | null;
            profile_uid?: string | undefined;
        } | null | undefined;
        version?: string | undefined;
    } | {
        type: "user";
        comment?: string | undefined;
        created_at?: string | undefined;
        created_by?: {
            email: string | null;
            full_name: string | null;
            username: string | null;
            profile_uid?: string | undefined;
        } | undefined;
        id?: string | undefined;
        owner?: "cases" | "observability" | "securitySolution" | undefined;
        pushed_at?: string | null | undefined;
        pushed_by?: {
            email: string | null;
            full_name: string | null;
            username: string | null;
            profile_uid?: string | undefined;
        } | null | undefined;
        updated_at?: string | null | undefined;
        updated_by?: {
            email: string | null;
            full_name: string | null;
            username: string | null;
            profile_uid?: string | undefined;
        } | null | undefined;
        version?: string | undefined;
    })[];
    connector: {
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
    };
    created_at: string;
    created_by: {
        email: string | null;
        full_name: string | null;
        username: string | null;
        profile_uid?: string | undefined;
    };
    description: string;
    duration: number | null;
    external_service: {
        connector_id?: string | undefined;
        connector_name?: string | undefined;
        external_id?: string | undefined;
        external_title?: string | undefined;
        external_url?: string | undefined;
        pushed_at?: string | undefined;
        pushed_by?: {
            email?: string | null | undefined;
            full_name?: string | null | undefined;
            username?: string | null | undefined;
            profile_uid?: string | undefined;
        } | null | undefined;
    } | null;
    id: string;
    observables: {
        id: string;
        typeKey: string;
        value: string;
        description: string | null;
        createdAt: string;
        updatedAt: string | null;
    }[];
    owner: "cases" | "observability" | "securitySolution";
    settings: {
        syncAlerts: boolean;
        extractObservables?: boolean | undefined;
    };
    severity: "critical" | "medium" | "high" | "low";
    status: "closed" | "open" | "in-progress";
    tags: string[];
    title: string;
    totalAlerts: number;
    totalComment: number;
    total_observables: number | null;
    updated_at: string | null;
    updated_by: {
        email: string | null;
        full_name: string | null;
        username: string | null;
        profile_uid?: string | undefined;
    } | null;
    version: string;
    assignees?: {
        uid: string;
    }[] | null | undefined;
    category?: string | null | undefined;
    customFields?: {
        key?: string | undefined;
        type?: "text" | "toggle" | undefined;
        value?: string | boolean | null | undefined;
    }[] | undefined;
    incremental_id?: number | null | undefined;
    totalEvents?: number | undefined;
}>;
export declare const updateSingleCaseFromInput: <TInput extends CaseIdVersionInput>(client: CasesClient, input: TInput, updates: WorkflowUpdatePayload) => Promise<{
    closed_at: string | null;
    closed_by: {
        email: string | null;
        full_name: string | null;
        username: string | null;
        profile_uid?: string | undefined;
    } | null;
    comments: ({
        type: "alert";
        alertId?: string[] | undefined;
        created_at?: string | undefined;
        created_by?: {
            email: string | null;
            full_name: string | null;
            username: string | null;
            profile_uid?: string | undefined;
        } | undefined;
        id?: string | undefined;
        index?: string[] | undefined;
        owner?: "cases" | "observability" | "securitySolution" | undefined;
        pushed_at?: string | null | undefined;
        pushed_by?: {
            email: string | null;
            full_name: string | null;
            username: string | null;
            profile_uid?: string | undefined;
        } | null | undefined;
        rule?: {
            id?: string | null | undefined;
            name?: string | null | undefined;
        } | undefined;
        updated_at?: string | null | undefined;
        updated_by?: {
            email: string | null;
            full_name: string | null;
            username: string | null;
            profile_uid?: string | undefined;
        } | null | undefined;
        version?: string | undefined;
    } | {
        type: "event";
        created_at?: string | undefined;
        created_by?: {
            email: string | null;
            full_name: string | null;
            username: string | null;
            profile_uid?: string | undefined;
        } | undefined;
        eventId?: string[] | undefined;
        id?: string | undefined;
        index?: string[] | undefined;
        owner?: "cases" | "observability" | "securitySolution" | undefined;
        pushed_at?: string | null | undefined;
        pushed_by?: {
            email: string | null;
            full_name: string | null;
            username: string | null;
            profile_uid?: string | undefined;
        } | null | undefined;
        updated_at?: string | null | undefined;
        updated_by?: {
            email: string | null;
            full_name: string | null;
            username: string | null;
            profile_uid?: string | undefined;
        } | null | undefined;
        version?: string | undefined;
    } | {
        type: "user";
        comment?: string | undefined;
        created_at?: string | undefined;
        created_by?: {
            email: string | null;
            full_name: string | null;
            username: string | null;
            profile_uid?: string | undefined;
        } | undefined;
        id?: string | undefined;
        owner?: "cases" | "observability" | "securitySolution" | undefined;
        pushed_at?: string | null | undefined;
        pushed_by?: {
            email: string | null;
            full_name: string | null;
            username: string | null;
            profile_uid?: string | undefined;
        } | null | undefined;
        updated_at?: string | null | undefined;
        updated_by?: {
            email: string | null;
            full_name: string | null;
            username: string | null;
            profile_uid?: string | undefined;
        } | null | undefined;
        version?: string | undefined;
    })[];
    connector: {
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
    };
    created_at: string;
    created_by: {
        email: string | null;
        full_name: string | null;
        username: string | null;
        profile_uid?: string | undefined;
    };
    description: string;
    duration: number | null;
    external_service: {
        connector_id?: string | undefined;
        connector_name?: string | undefined;
        external_id?: string | undefined;
        external_title?: string | undefined;
        external_url?: string | undefined;
        pushed_at?: string | undefined;
        pushed_by?: {
            email?: string | null | undefined;
            full_name?: string | null | undefined;
            username?: string | null | undefined;
            profile_uid?: string | undefined;
        } | null | undefined;
    } | null;
    id: string;
    observables: {
        id: string;
        typeKey: string;
        value: string;
        description: string | null;
        createdAt: string;
        updatedAt: string | null;
    }[];
    owner: "cases" | "observability" | "securitySolution";
    settings: {
        syncAlerts: boolean;
        extractObservables?: boolean | undefined;
    };
    severity: "critical" | "medium" | "high" | "low";
    status: "closed" | "open" | "in-progress";
    tags: string[];
    title: string;
    totalAlerts: number;
    totalComment: number;
    total_observables: number | null;
    updated_at: string | null;
    updated_by: {
        email: string | null;
        full_name: string | null;
        username: string | null;
        profile_uid?: string | undefined;
    } | null;
    version: string;
    assignees?: {
        uid: string;
    }[] | null | undefined;
    category?: string | null | undefined;
    customFields?: {
        key?: string | undefined;
        type?: "text" | "toggle" | undefined;
        value?: string | boolean | null | undefined;
    }[] | undefined;
    incremental_id?: number | null | undefined;
    totalEvents?: number | undefined;
}>;
export declare const createUpdateSingleCaseStepHandler: <TInput extends CaseIdVersionInput>(getCasesClient: (request: KibanaRequest) => Promise<CasesClient>, getUpdates: (input: TInput) => WorkflowUpdatePayload) => (context: import("@kbn/workflows-extensions/server").StepHandlerContext) => Promise<{
    output: {
        case: {
            closed_at: string | null;
            closed_by: {
                email: string | null;
                full_name: string | null;
                username: string | null;
                profile_uid?: string | undefined;
            } | null;
            comments: ({
                type: "alert";
                alertId?: string[] | undefined;
                created_at?: string | undefined;
                created_by?: {
                    email: string | null;
                    full_name: string | null;
                    username: string | null;
                    profile_uid?: string | undefined;
                } | undefined;
                id?: string | undefined;
                index?: string[] | undefined;
                owner?: "cases" | "observability" | "securitySolution" | undefined;
                pushed_at?: string | null | undefined;
                pushed_by?: {
                    email: string | null;
                    full_name: string | null;
                    username: string | null;
                    profile_uid?: string | undefined;
                } | null | undefined;
                rule?: {
                    id?: string | null | undefined;
                    name?: string | null | undefined;
                } | undefined;
                updated_at?: string | null | undefined;
                updated_by?: {
                    email: string | null;
                    full_name: string | null;
                    username: string | null;
                    profile_uid?: string | undefined;
                } | null | undefined;
                version?: string | undefined;
            } | {
                type: "event";
                created_at?: string | undefined;
                created_by?: {
                    email: string | null;
                    full_name: string | null;
                    username: string | null;
                    profile_uid?: string | undefined;
                } | undefined;
                eventId?: string[] | undefined;
                id?: string | undefined;
                index?: string[] | undefined;
                owner?: "cases" | "observability" | "securitySolution" | undefined;
                pushed_at?: string | null | undefined;
                pushed_by?: {
                    email: string | null;
                    full_name: string | null;
                    username: string | null;
                    profile_uid?: string | undefined;
                } | null | undefined;
                updated_at?: string | null | undefined;
                updated_by?: {
                    email: string | null;
                    full_name: string | null;
                    username: string | null;
                    profile_uid?: string | undefined;
                } | null | undefined;
                version?: string | undefined;
            } | {
                type: "user";
                comment?: string | undefined;
                created_at?: string | undefined;
                created_by?: {
                    email: string | null;
                    full_name: string | null;
                    username: string | null;
                    profile_uid?: string | undefined;
                } | undefined;
                id?: string | undefined;
                owner?: "cases" | "observability" | "securitySolution" | undefined;
                pushed_at?: string | null | undefined;
                pushed_by?: {
                    email: string | null;
                    full_name: string | null;
                    username: string | null;
                    profile_uid?: string | undefined;
                } | null | undefined;
                updated_at?: string | null | undefined;
                updated_by?: {
                    email: string | null;
                    full_name: string | null;
                    username: string | null;
                    profile_uid?: string | undefined;
                } | null | undefined;
                version?: string | undefined;
            })[];
            connector: {
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
            };
            created_at: string;
            created_by: {
                email: string | null;
                full_name: string | null;
                username: string | null;
                profile_uid?: string | undefined;
            };
            description: string;
            duration: number | null;
            external_service: {
                connector_id?: string | undefined;
                connector_name?: string | undefined;
                external_id?: string | undefined;
                external_title?: string | undefined;
                external_url?: string | undefined;
                pushed_at?: string | undefined;
                pushed_by?: {
                    email?: string | null | undefined;
                    full_name?: string | null | undefined;
                    username?: string | null | undefined;
                    profile_uid?: string | undefined;
                } | null | undefined;
            } | null;
            id: string;
            observables: {
                id: string;
                typeKey: string;
                value: string;
                description: string | null;
                createdAt: string;
                updatedAt: string | null;
            }[];
            owner: "cases" | "observability" | "securitySolution";
            settings: {
                syncAlerts: boolean;
                extractObservables?: boolean | undefined;
            };
            severity: "critical" | "medium" | "high" | "low";
            status: "closed" | "open" | "in-progress";
            tags: string[];
            title: string;
            totalAlerts: number;
            totalComment: number;
            total_observables: number | null;
            updated_at: string | null;
            updated_by: {
                email: string | null;
                full_name: string | null;
                username: string | null;
                profile_uid?: string | undefined;
            } | null;
            version: string;
            assignees?: {
                uid: string;
            }[] | null | undefined;
            category?: string | null | undefined;
            customFields?: {
                key?: string | undefined;
                type?: "text" | "toggle" | undefined;
                value?: string | boolean | null | undefined;
            }[] | undefined;
            incremental_id?: number | null | undefined;
            totalEvents?: number | undefined;
        };
    };
    error?: undefined;
} | {
    error: any;
    output?: undefined;
}>;
export {};
