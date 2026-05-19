export declare const scheduleBackfillExamples: () => string;
export declare const scheduleBodySchema: import("@kbn/config-schema").Type<Readonly<{
    run_actions?: boolean | undefined;
} & {
    ranges: Readonly<{} & {
        start: string;
        end: string;
    }>[];
    rule_id: string;
}>[]>;
export declare const scheduleResponseSchema: import("@kbn/config-schema").Type<(Readonly<{
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
}> | Readonly<{} & {
    error: Readonly<{
        status?: number | undefined;
    } & {
        message: string;
        rule: Readonly<{
            name?: string | undefined;
        } & {
            id: string;
        }>;
    }>;
}>)[]>;
