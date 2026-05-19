export declare const findBackfillExamples: () => string;
export declare const findQuerySchema: import("@kbn/config-schema").ObjectType<{
    end: import("@kbn/config-schema").Type<string | undefined>;
    page: import("@kbn/config-schema").Type<number>;
    per_page: import("@kbn/config-schema").Type<number>;
    rule_ids: import("@kbn/config-schema").Type<string | undefined>;
    initiator: import("@kbn/config-schema").Type<"user" | "system" | undefined>;
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
        status: "complete" | "error" | "pending" | "timeout" | "running";
        duration: string;
        start: string;
        enabled: boolean;
        rule: Readonly<{
            api_key_created_by_user?: boolean | null | undefined;
        } & {
            tags: string[];
            name: string;
            id: string;
            params: Record<string, any>;
            enabled: boolean;
            updated_at: string;
            updated_by: string | null;
            created_at: string;
            created_by: string | null;
            schedule: Readonly<{} & {
                interval: string;
            }>;
            consumer: string;
            revision: number;
            rule_type_id: string;
            api_key_owner: string | null;
        }>;
        created_at: string;
        schedule: Readonly<{} & {
            status: "complete" | "error" | "pending" | "timeout" | "running";
            interval: string;
            run_at: string;
        }>[];
        space_id: string;
        initiator: "user" | "system";
    }>[]>;
}>;
