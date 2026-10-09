export declare const scheduleBackfillExamples: () => string;
export declare const scheduleBodySchema: import("@kbn/config-schema").Type<Readonly<{
    run_actions?: boolean | undefined;
} & {
    rule_id: string;
    ranges: Readonly<{} & {
        start: string;
        end: string;
    }>[];
}>[]>;
export declare const scheduleResponseSchema: import("@kbn/config-schema").Type<(Readonly<{
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
