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
}> | Readonly<{} & {
    error: Readonly<{
        status?: number | undefined;
    } & {
        rule: Readonly<{
            name?: string | undefined;
        } & {
            id: string;
        }>;
        message: string;
    }>;
}>)[]>;
