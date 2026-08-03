export declare const findBackfillExamples: () => string;
export declare const findQuerySchema: import("@kbn/config-schema").ObjectType<{
    end: import("@kbn/config-schema").Type<string | undefined>;
    page: import("@kbn/config-schema").Type<number>;
    per_page: import("@kbn/config-schema").Type<number>;
    rule_ids: import("@kbn/config-schema").Type<string | undefined>;
    initiator: import("@kbn/config-schema").Type<"system" | "user" | undefined>;
    start: import("@kbn/config-schema").Type<string | undefined>;
    sort_field: import("@kbn/config-schema").Type<"start" | "createdAt" | undefined>;
    sort_order: import("@kbn/config-schema").Type<"asc" | "desc" | undefined>;
}>;
export declare const findResponseSchema: import("@kbn/config-schema").ObjectType<{
    page: import("@kbn/config-schema").Type<number>;
    per_page: import("@kbn/config-schema").Type<number>;
    total: import("@kbn/config-schema").Type<number>;
    data: import("@kbn/config-schema").Type<Readonly<{
        end?: string | undefined;
        initiator_id?: string | undefined;
    } & {
        id: string;
        rule: Readonly<{
            api_key_created_by_user?: boolean | null | undefined;
        } & {
            id: string;
            params: Record<string, any>;
            enabled: boolean;
            name: string;
            created_at: string;
            created_by: string | null;
            updated_at: string;
            updated_by: string | null;
            tags: string[];
            revision: number;
            consumer: string;
            schedule: Readonly<{} & {
                interval: string;
            }>;
            api_key_owner: string | null;
            rule_type_id: string;
        }>;
        enabled: boolean;
        status: "error" | "complete" | "timeout" | "running" | "pending";
        start: string;
        created_at: string;
        duration: string;
        space_id: string;
        schedule: Readonly<{} & {
            status: "error" | "complete" | "timeout" | "running" | "pending";
            interval: string;
            run_at: string;
        }>[];
        initiator: "system" | "user";
    }>[]>;
}>;
