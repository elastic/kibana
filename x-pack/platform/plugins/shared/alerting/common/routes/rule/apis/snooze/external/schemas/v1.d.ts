export declare const snoozeParamsSchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string>;
}>;
export declare const snoozeBodySchema: import("@kbn/config-schema").ObjectType<{
    schedule: import("@kbn/config-schema").ObjectType<{
        custom: import("@kbn/config-schema").Type<Readonly<{
            timezone?: string | undefined;
            recurring?: Readonly<{
                every?: string | undefined;
                end?: string | undefined;
                onWeekDay?: string[] | undefined;
                onMonthDay?: number[] | undefined;
                onMonth?: number[] | undefined;
                occurrences?: number | undefined;
            } & {}> | undefined;
        } & {
            start: string;
            duration: string;
        }> | undefined>;
    }>;
}>;
export declare const snoozeResponseSchema: import("@kbn/config-schema").ObjectType<{
    body: import("@kbn/config-schema").ObjectType<{
        schedule: import("@kbn/config-schema").ObjectType<{
            id: import("@kbn/config-schema").Type<string>;
            custom: import("@kbn/config-schema").Type<Readonly<{
                timezone?: string | undefined;
                recurring?: Readonly<{
                    every?: string | undefined;
                    end?: string | undefined;
                    onWeekDay?: string[] | undefined;
                    onMonthDay?: number[] | undefined;
                    onMonth?: number[] | undefined;
                    occurrences?: number | undefined;
                } & {}> | undefined;
            } & {
                start: string;
                duration: string;
            }> | undefined>;
        }>;
    }>;
}>;
