export declare const findBackfillExamples: () => string;
export declare const findQuerySchema: import("@kbn/config-schema").ObjectType<{
    end: import("@kbn/config-schema").Type<string | undefined>;
    page: import("@kbn/config-schema").Type<number>;
    per_page: import("@kbn/config-schema").Type<number>;
    rule_ids: import("@kbn/config-schema").Type<string | undefined>;
    initiator: import("@kbn/config-schema").Type<"user" | "system" | undefined>;
    start: import("@kbn/config-schema").Type<string | undefined>;
    sort_field: import("@kbn/config-schema").Type<"start" | "createdAt" | undefined>;
    sort_order: import("@kbn/config-schema").Type<"desc" | "asc" | undefined>;
}>;
export declare const findResponseSchema: import("@kbn/config-schema").ObjectType<{
    page: import("@kbn/config-schema").Type<number>;
    per_page: import("@kbn/config-schema").Type<number>;
    total: import("@kbn/config-schema").Type<number>;
    data: import("@kbn/config-schema").Type<Readonly<{
        end?: string | undefined;
        initiator_id?: string | undefined;
    } & {
        enabled: boolean;
        id: string;
        status: "error" | "pending" | "timeout" | "complete" | "running";
        start: string;
        rule: Readonly<{
            api_key_created_by_user?: boolean | null | undefined;
        } & {
            enabled: boolean;
            id: string;
            name: string;
            params: Record<string, any>;
            tags: string[];
            created_at: string;
            updated_at: string;
            created_by: string | null;
            updated_by: string | null;
            schedule: Readonly<{} & {
                interval: string;
            }>;
            consumer: string;
            revision: number;
            rule_type_id: string;
            api_key_owner: string | null;
        }>;
        created_at: string;
        duration: string;
        space_id: string;
        schedule: Readonly<{} & {
            status: "error" | "pending" | "timeout" | "complete" | "running";
            interval: string;
            run_at: string;
        }>[];
        initiator: "user" | "system";
    }>[]>;
}>;
