export declare const findBackfillExamples: () => string;
export declare const findQuerySchema: import("@kbn/config-schema").ObjectType<{
    end: import("@kbn/config-schema").Type<string | undefined>;
    page: import("@kbn/config-schema").Type<number>;
    per_page: import("@kbn/config-schema").Type<number>;
    rule_ids: import("@kbn/config-schema").Type<string | undefined>;
    initiator: import("@kbn/config-schema").Type<"system" | "user" | undefined>;
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
        status: "error" | "complete" | "timeout" | "pending" | "running";
        id: string;
        rule: Readonly<{
            api_key_created_by_user?: boolean | null | undefined;
        } & {
            id: string;
            name: string;
            tags: string[];
            params: Record<string, any>;
            enabled: boolean;
            updated_at: string;
            schedule: Readonly<{} & {
                interval: string;
            }>;
            updated_by: string | null;
            created_at: string;
            created_by: string | null;
            consumer: string;
            revision: number;
            rule_type_id: string;
            api_key_owner: string | null;
        }>;
        duration: string;
        start: string;
        enabled: boolean;
        schedule: Readonly<{} & {
            status: "error" | "complete" | "timeout" | "pending" | "running";
            interval: string;
            run_at: string;
        }>[];
        created_at: string;
        space_id: string;
        initiator: "system" | "user";
    }>[]>;
}>;
