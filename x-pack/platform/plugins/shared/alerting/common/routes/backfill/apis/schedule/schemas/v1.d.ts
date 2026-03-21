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
