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
