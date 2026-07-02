export declare const scheduleBackfillExamples: () => string;
export declare const scheduleBodySchema: import("@kbn/config-schema").Type<Readonly<{
    run_actions?: boolean | undefined;
} & {
    ranges: Readonly<{} & {
        end: string;
        start: string;
    }>[];
    rule_id: string;
}>[]>;
export declare const scheduleResponseSchema: import("@kbn/config-schema").Type<(Readonly<{
    end?: string | undefined;
    initiator_id?: string | undefined;
} & {
    id: string;
    status: "error" | "complete" | "running" | "pending" | "timeout";
    created_at: string;
    duration: string;
    enabled: boolean;
    start: string;
    schedule: Readonly<{} & {
        status: "error" | "complete" | "running" | "pending" | "timeout";
        interval: string;
        run_at: string;
    }>[];
    rule: Readonly<{
        api_key_created_by_user?: boolean | null | undefined;
    } & {
        id: string;
        name: string;
        created_at: string;
        updated_at: string;
        enabled: boolean;
        params: Record<string, any>;
        tags: string[];
        schedule: Readonly<{} & {
            interval: string;
        }>;
        consumer: string;
        revision: number;
        created_by: string | null;
        updated_by: string | null;
        rule_type_id: string;
        api_key_owner: string | null;
    }>;
    initiator: "system" | "user";
    space_id: string;
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
