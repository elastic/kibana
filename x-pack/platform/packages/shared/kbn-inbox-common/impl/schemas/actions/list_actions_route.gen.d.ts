import type { z } from '@kbn/zod/v4';
export declare const InboxAction: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    status: z.ZodEnum<{
        pending: "pending";
        rejected: "rejected";
        approved: "approved";
    }>;
    source_app: z.ZodString;
    source_id: z.ZodString;
    requested_by: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    created_at: z.ZodString;
    input_schema: z.ZodOptional<z.ZodNullable<z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>>>;
    input_message: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    timeout_at: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    responded_by: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    responded_at: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    channel: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    response_mode: z.ZodOptional<z.ZodNullable<z.ZodEnum<{
        pending: "pending";
        timed_out: "timed_out";
        responded: "responded";
    }>>>;
}, z.core.$strip>;
export type InboxAction = z.infer<typeof InboxAction>;
export declare const ListInboxActionsRequestQuery: z.ZodObject<{
    status: z.ZodOptional<z.ZodEnum<{
        pending: "pending";
        rejected: "rejected";
        approved: "approved";
    }>>;
    source_app: z.ZodOptional<z.ZodString>;
    page: z.ZodDefault<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
    per_page: z.ZodDefault<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
}, z.core.$strip>;
export type ListInboxActionsRequestQuery = z.infer<typeof ListInboxActionsRequestQuery>;
export type ListInboxActionsRequestQueryInput = z.input<typeof ListInboxActionsRequestQuery>;
export declare const ListInboxActionsResponse: z.ZodObject<{
    actions: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        status: z.ZodEnum<{
            pending: "pending";
            rejected: "rejected";
            approved: "approved";
        }>;
        source_app: z.ZodString;
        source_id: z.ZodString;
        requested_by: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        created_at: z.ZodString;
        input_schema: z.ZodOptional<z.ZodNullable<z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>>>;
        input_message: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        timeout_at: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        responded_by: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        responded_at: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        channel: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        response_mode: z.ZodOptional<z.ZodNullable<z.ZodEnum<{
            pending: "pending";
            timed_out: "timed_out";
            responded: "responded";
        }>>>;
    }, z.core.$strip>>;
    total: z.ZodNumber;
}, z.core.$strip>;
export type ListInboxActionsResponse = z.infer<typeof ListInboxActionsResponse>;
