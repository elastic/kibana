import type { KibanaRequest } from '@kbn/core/server';
import type { CasesClient } from '../../client';
export declare const findCasesStepDefinition: (getCasesClient: (request: KibanaRequest) => Promise<CasesClient>) => import("@kbn/workflows-extensions/server").ServerStepDefinition<import("zod").ZodObject<{
    assignees: import("zod").ZodOptional<import("zod").ZodUnion<readonly [import("zod").ZodString, import("zod").ZodArray<import("zod").ZodString>]>>;
    category: import("zod").ZodOptional<import("zod").ZodUnion<readonly [import("zod").ZodString, import("zod").ZodArray<import("zod").ZodString>]>>;
    customFields: import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodArray<import("zod").ZodUnion<readonly [import("zod").ZodString, import("zod").ZodBoolean, import("zod").ZodNumber, import("zod").ZodNull]>>>>;
    defaultSearchOperator: import("zod").ZodOptional<import("zod").ZodEnum<{
        AND: "AND";
        OR: "OR";
    }>>;
    from: import("zod").ZodOptional<import("zod").ZodString>;
    owner: import("zod").ZodOptional<import("zod").ZodUnion<readonly [import("zod").ZodEnum<{
        cases: "cases";
        observability: "observability";
        securitySolution: "securitySolution";
    }>, import("zod").ZodArray<import("zod").ZodEnum<{
        cases: "cases";
        observability: "observability";
        securitySolution: "securitySolution";
    }>>]>>;
    page: import("zod").ZodDefault<import("zod").ZodOptional<import("zod").ZodNumber>>;
    perPage: import("zod").ZodDefault<import("zod").ZodOptional<import("zod").ZodNumber>>;
    reporters: import("zod").ZodOptional<import("zod").ZodUnion<readonly [import("zod").ZodString, import("zod").ZodArray<import("zod").ZodString>]>>;
    search: import("zod").ZodOptional<import("zod").ZodString>;
    searchFields: import("zod").ZodOptional<import("zod").ZodUnion<readonly [import("zod").ZodUnion<readonly [import("zod").ZodEnum<{
        description: "description";
        title: "title";
    }>, import("zod").ZodLiteral<"incremental_id.text">]>, import("zod").ZodUnion<readonly [import("zod").ZodArray<import("zod").ZodEnum<{
        description: "description";
        title: "title";
    }>>, import("zod").ZodArray<import("zod").ZodUnion<readonly [import("zod").ZodEnum<{
        description: "description";
        title: "title";
    }>, import("zod").ZodLiteral<"incremental_id.text">]>>]>]>>;
    severity: import("zod").ZodOptional<import("zod").ZodUnion<readonly [import("zod").ZodEnum<{
        critical: "critical";
        medium: "medium";
        high: "high";
        low: "low";
    }>, import("zod").ZodArray<import("zod").ZodEnum<{
        critical: "critical";
        medium: "medium";
        high: "high";
        low: "low";
    }>>]>>;
    sortField: import("zod").ZodOptional<import("zod").ZodEnum<{
        status: "status";
        title: "title";
        severity: "severity";
        category: "category";
        updatedAt: "updatedAt";
        createdAt: "createdAt";
        closedAt: "closedAt";
    }>>;
    sortOrder: import("zod").ZodOptional<import("zod").ZodEnum<{
        asc: "asc";
        desc: "desc";
    }>>;
    status: import("zod").ZodOptional<import("zod").ZodUnion<readonly [import("zod").ZodEnum<{
        closed: "closed";
        open: "open";
        "in-progress": "in-progress";
    }>, import("zod").ZodArray<import("zod").ZodEnum<{
        closed: "closed";
        open: "open";
        "in-progress": "in-progress";
    }>>]>>;
    tags: import("zod").ZodOptional<import("zod").ZodUnion<readonly [import("zod").ZodString, import("zod").ZodArray<import("zod").ZodString>]>>;
    to: import("zod").ZodOptional<import("zod").ZodString>;
}, import("zod/v4/core").$strip>, import("zod").ZodObject<{
    cases: import("zod").ZodArray<import("zod").ZodObject<{
        assignees: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodArray<import("zod").ZodObject<{
            uid: import("zod").ZodString;
        }, import("zod/v4/core").$strip>>>>;
        category: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
        closed_at: import("zod").ZodNullable<import("zod").ZodString>;
        closed_by: import("zod").ZodNullable<import("zod").ZodObject<{
            email: import("zod").ZodNullable<import("zod").ZodString>;
            full_name: import("zod").ZodNullable<import("zod").ZodString>;
            username: import("zod").ZodNullable<import("zod").ZodString>;
            profile_uid: import("zod").ZodOptional<import("zod").ZodString>;
        }, import("zod/v4/core").$strip>>;
        comments: import("zod").ZodArray<import("zod").ZodDiscriminatedUnion<[import("zod").ZodObject<{
            alertId: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
            created_at: import("zod").ZodOptional<import("zod").ZodString>;
            created_by: import("zod").ZodOptional<import("zod").ZodObject<{
                email: import("zod").ZodNullable<import("zod").ZodString>;
                full_name: import("zod").ZodNullable<import("zod").ZodString>;
                username: import("zod").ZodNullable<import("zod").ZodString>;
                profile_uid: import("zod").ZodOptional<import("zod").ZodString>;
            }, import("zod/v4/core").$strip>>;
            id: import("zod").ZodOptional<import("zod").ZodString>;
            index: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
            owner: import("zod").ZodOptional<import("zod").ZodEnum<{
                cases: "cases";
                observability: "observability";
                securitySolution: "securitySolution";
            }>>;
            pushed_at: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
            pushed_by: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodObject<{
                email: import("zod").ZodNullable<import("zod").ZodString>;
                full_name: import("zod").ZodNullable<import("zod").ZodString>;
                username: import("zod").ZodNullable<import("zod").ZodString>;
                profile_uid: import("zod").ZodOptional<import("zod").ZodString>;
            }, import("zod/v4/core").$strip>>>;
            rule: import("zod").ZodOptional<import("zod").ZodObject<{
                id: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
                name: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
            }, import("zod/v4/core").$strip>>;
            type: import("zod").ZodLiteral<"alert">;
            updated_at: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
            updated_by: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodObject<{
                email: import("zod").ZodNullable<import("zod").ZodString>;
                full_name: import("zod").ZodNullable<import("zod").ZodString>;
                username: import("zod").ZodNullable<import("zod").ZodString>;
                profile_uid: import("zod").ZodOptional<import("zod").ZodString>;
            }, import("zod/v4/core").$strip>>>;
            version: import("zod").ZodOptional<import("zod").ZodString>;
        }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
            created_at: import("zod").ZodOptional<import("zod").ZodString>;
            created_by: import("zod").ZodOptional<import("zod").ZodObject<{
                email: import("zod").ZodNullable<import("zod").ZodString>;
                full_name: import("zod").ZodNullable<import("zod").ZodString>;
                username: import("zod").ZodNullable<import("zod").ZodString>;
                profile_uid: import("zod").ZodOptional<import("zod").ZodString>;
            }, import("zod/v4/core").$strip>>;
            eventId: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
            id: import("zod").ZodOptional<import("zod").ZodString>;
            index: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
            owner: import("zod").ZodOptional<import("zod").ZodEnum<{
                cases: "cases";
                observability: "observability";
                securitySolution: "securitySolution";
            }>>;
            pushed_at: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
            pushed_by: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodObject<{
                email: import("zod").ZodNullable<import("zod").ZodString>;
                full_name: import("zod").ZodNullable<import("zod").ZodString>;
                username: import("zod").ZodNullable<import("zod").ZodString>;
                profile_uid: import("zod").ZodOptional<import("zod").ZodString>;
            }, import("zod/v4/core").$strip>>>;
            type: import("zod").ZodLiteral<"event">;
            updated_at: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
            updated_by: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodObject<{
                email: import("zod").ZodNullable<import("zod").ZodString>;
                full_name: import("zod").ZodNullable<import("zod").ZodString>;
                username: import("zod").ZodNullable<import("zod").ZodString>;
                profile_uid: import("zod").ZodOptional<import("zod").ZodString>;
            }, import("zod/v4/core").$strip>>>;
            version: import("zod").ZodOptional<import("zod").ZodString>;
        }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
            comment: import("zod").ZodOptional<import("zod").ZodString>;
            created_at: import("zod").ZodOptional<import("zod").ZodString>;
            created_by: import("zod").ZodOptional<import("zod").ZodObject<{
                email: import("zod").ZodNullable<import("zod").ZodString>;
                full_name: import("zod").ZodNullable<import("zod").ZodString>;
                username: import("zod").ZodNullable<import("zod").ZodString>;
                profile_uid: import("zod").ZodOptional<import("zod").ZodString>;
            }, import("zod/v4/core").$strip>>;
            id: import("zod").ZodOptional<import("zod").ZodString>;
            owner: import("zod").ZodOptional<import("zod").ZodEnum<{
                cases: "cases";
                observability: "observability";
                securitySolution: "securitySolution";
            }>>;
            pushed_at: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
            pushed_by: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodObject<{
                email: import("zod").ZodNullable<import("zod").ZodString>;
                full_name: import("zod").ZodNullable<import("zod").ZodString>;
                username: import("zod").ZodNullable<import("zod").ZodString>;
                profile_uid: import("zod").ZodOptional<import("zod").ZodString>;
            }, import("zod/v4/core").$strip>>>;
            type: import("zod").ZodLiteral<"user">;
            updated_at: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
            updated_by: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodObject<{
                email: import("zod").ZodNullable<import("zod").ZodString>;
                full_name: import("zod").ZodNullable<import("zod").ZodString>;
                username: import("zod").ZodNullable<import("zod").ZodString>;
                profile_uid: import("zod").ZodOptional<import("zod").ZodString>;
            }, import("zod/v4/core").$strip>>>;
            version: import("zod").ZodOptional<import("zod").ZodString>;
        }, import("zod/v4/core").$strip>], "type">>;
        connector: import("zod").ZodDiscriminatedUnion<[import("zod").ZodObject<{
            fields: import("zod").ZodNullable<import("zod").ZodString>;
            id: import("zod").ZodString;
            name: import("zod").ZodString;
            type: import("zod").ZodLiteral<".none">;
        }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
            fields: import("zod").ZodNullable<import("zod").ZodString>;
            id: import("zod").ZodString;
            name: import("zod").ZodString;
            type: import("zod").ZodLiteral<".cases-webhook">;
        }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
            fields: import("zod").ZodObject<{
                issueType: import("zod").ZodNullable<import("zod").ZodString>;
                parent: import("zod").ZodNullable<import("zod").ZodString>;
                priority: import("zod").ZodNullable<import("zod").ZodString>;
            }, import("zod/v4/core").$strip>;
            id: import("zod").ZodString;
            name: import("zod").ZodString;
            type: import("zod").ZodLiteral<".jira">;
        }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
            fields: import("zod").ZodNullable<import("zod").ZodObject<{
                issueTypes: import("zod").ZodArray<import("zod").ZodString>;
                severityCode: import("zod").ZodString;
            }, import("zod/v4/core").$strip>>;
            id: import("zod").ZodString;
            name: import("zod").ZodString;
            type: import("zod").ZodLiteral<".resilient">;
        }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
            fields: import("zod").ZodObject<{
                category: import("zod").ZodNullable<import("zod").ZodString>;
                impact: import("zod").ZodNullable<import("zod").ZodString>;
                severity: import("zod").ZodNullable<import("zod").ZodString>;
                subcategory: import("zod").ZodNullable<import("zod").ZodString>;
                urgency: import("zod").ZodNullable<import("zod").ZodString>;
            }, import("zod/v4/core").$strip>;
            id: import("zod").ZodString;
            name: import("zod").ZodString;
            type: import("zod").ZodLiteral<".servicenow">;
        }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
            fields: import("zod").ZodObject<{
                category: import("zod").ZodNullable<import("zod").ZodString>;
                destIp: import("zod").ZodNullable<import("zod").ZodBoolean>;
                malwareHash: import("zod").ZodNullable<import("zod").ZodBoolean>;
                malwareUrl: import("zod").ZodNullable<import("zod").ZodBoolean>;
                priority: import("zod").ZodNullable<import("zod").ZodString>;
                sourceIp: import("zod").ZodNullable<import("zod").ZodBoolean>;
                subcategory: import("zod").ZodNullable<import("zod").ZodString>;
            }, import("zod/v4/core").$strip>;
            id: import("zod").ZodString;
            name: import("zod").ZodString;
            type: import("zod").ZodLiteral<".servicenow-sir">;
        }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
            fields: import("zod").ZodObject<{
                caseId: import("zod").ZodNullable<import("zod").ZodString>;
            }, import("zod/v4/core").$strip>;
            id: import("zod").ZodString;
            name: import("zod").ZodString;
            type: import("zod").ZodLiteral<".swimlane">;
        }, import("zod/v4/core").$strip>], "type">;
        created_at: import("zod").ZodString;
        created_by: import("zod").ZodObject<{
            email: import("zod").ZodNullable<import("zod").ZodString>;
            full_name: import("zod").ZodNullable<import("zod").ZodString>;
            username: import("zod").ZodNullable<import("zod").ZodString>;
            profile_uid: import("zod").ZodOptional<import("zod").ZodString>;
        }, import("zod/v4/core").$strip>;
        customFields: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodObject<{
            key: import("zod").ZodOptional<import("zod").ZodString>;
            type: import("zod").ZodOptional<import("zod").ZodEnum<{
                text: "text";
                toggle: "toggle";
            }>>;
            value: import("zod").ZodOptional<import("zod").ZodUnion<readonly [import("zod").ZodNullable<import("zod").ZodString>, import("zod").ZodBoolean]>>;
        }, import("zod/v4/core").$strip>>>;
        description: import("zod").ZodString;
        duration: import("zod").ZodNullable<import("zod").ZodNumber>;
        external_service: import("zod").ZodNullable<import("zod").ZodObject<{
            connector_id: import("zod").ZodOptional<import("zod").ZodString>;
            connector_name: import("zod").ZodOptional<import("zod").ZodString>;
            external_id: import("zod").ZodOptional<import("zod").ZodString>;
            external_title: import("zod").ZodOptional<import("zod").ZodString>;
            external_url: import("zod").ZodOptional<import("zod").ZodString>;
            pushed_at: import("zod").ZodOptional<import("zod").ZodString>;
            pushed_by: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodObject<{
                email: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
                full_name: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
                username: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
                profile_uid: import("zod").ZodOptional<import("zod").ZodString>;
            }, import("zod/v4/core").$strip>>>;
        }, import("zod/v4/core").$strip>>;
        id: import("zod").ZodString;
        incremental_id: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodNumber>>;
        observables: import("zod").ZodArray<import("zod").ZodObject<{
            id: import("zod").ZodString;
            typeKey: import("zod").ZodString;
            value: import("zod").ZodString;
            description: import("zod").ZodNullable<import("zod").ZodString>;
            createdAt: import("zod").ZodString;
            updatedAt: import("zod").ZodNullable<import("zod").ZodString>;
        }, import("zod/v4/core").$strip>>;
        owner: import("zod").ZodEnum<{
            cases: "cases";
            observability: "observability";
            securitySolution: "securitySolution";
        }>;
        settings: import("zod").ZodObject<{
            syncAlerts: import("zod").ZodBoolean;
            extractObservables: import("zod").ZodOptional<import("zod").ZodBoolean>;
        }, import("zod/v4/core").$strip>;
        severity: import("zod").ZodEnum<{
            critical: "critical";
            medium: "medium";
            high: "high";
            low: "low";
        }>;
        status: import("zod").ZodEnum<{
            closed: "closed";
            open: "open";
            "in-progress": "in-progress";
        }>;
        tags: import("zod").ZodArray<import("zod").ZodString>;
        title: import("zod").ZodString;
        totalAlerts: import("zod").ZodNumber;
        totalComment: import("zod").ZodNumber;
        total_observables: import("zod").ZodNullable<import("zod").ZodNumber>;
        totalEvents: import("zod").ZodOptional<import("zod").ZodNumber>;
        updated_at: import("zod").ZodNullable<import("zod").ZodString>;
        updated_by: import("zod").ZodNullable<import("zod").ZodObject<{
            email: import("zod").ZodNullable<import("zod").ZodString>;
            full_name: import("zod").ZodNullable<import("zod").ZodString>;
            username: import("zod").ZodNullable<import("zod").ZodString>;
            profile_uid: import("zod").ZodOptional<import("zod").ZodString>;
        }, import("zod/v4/core").$strip>>;
        version: import("zod").ZodString;
    }, import("zod/v4/core").$strip>>;
    count_closed_cases: import("zod").ZodNumber;
    count_in_progress_cases: import("zod").ZodNumber;
    count_open_cases: import("zod").ZodNumber;
    page: import("zod").ZodNumber;
    per_page: import("zod").ZodNumber;
    total: import("zod").ZodNumber;
}, import("zod/v4/core").$strip>, import("zod").ZodObject<import("zod/v4/core").$ZodLooseShape, import("zod/v4/core").$strip>>;
