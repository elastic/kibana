export declare const findBackfillExamples: () => string;
export declare const findQuerySchema: import("@kbn/config-schema").ObjectType<{
    end: import("@kbn/config-schema").Type<string | undefined>;
    page: import("@kbn/config-schema").Type<number>;
    per_page: import("@kbn/config-schema").Type<number>;
    rule_ids: import("@kbn/config-schema").Type<string | undefined>;
    initiator: import("@kbn/config-schema").Type<"system" | "user" | undefined>;
    start: import("@kbn/config-schema").Type<string | undefined>;
    sort_field: import("@kbn/config-schema").Type<"createdAt" | "start" | undefined>;
    sort_order: import("@kbn/config-schema").Type<"asc" | "desc" | undefined>;
}>;
export declare const findResponseSchema: import("@kbn/config-schema").ObjectType<{
    page: import("@kbn/config-schema").Type<number>;
    per_page: import("@kbn/config-schema").Type<number>;
    total: import("@kbn/config-schema").Type<number>;
    data: import("@kbn/config-schema").Type<Readonly<{
        initiator_id?: string | undefined;
        end?: string | undefined;
    } & {
        id: string;
        created_at: string;
        duration: string;
        enabled: boolean;
        rule: Readonly<{
            api_key_created_by_user?: boolean | null | undefined;
        } & {
            id: string;
            name: string;
            tags: string[];
            rule_type_id: string;
            params: Record<string, any>;
            api_key_owner: string | null;
            consumer: string;
            enabled: boolean;
            schedule: Readonly<{} & {
                interval: string;
            }>;
            created_by: string | null;
            updated_by: string | null;
            created_at: string;
            updated_at: string;
            revision: number;
        }>;
        space_id: string;
        initiator: "system" | "user";
        start: string;
        status: "complete" | "error" | "pending" | "running" | "timeout";
        schedule: Readonly<{} & {
            run_at: string;
            status: "complete" | "error" | "pending" | "running" | "timeout";
            interval: string;
        }>[];
    }>[]>;
}>;
