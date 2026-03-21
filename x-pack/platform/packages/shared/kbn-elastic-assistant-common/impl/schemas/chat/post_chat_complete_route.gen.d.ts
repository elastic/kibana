import { z } from '@kbn/zod/v4';
/**
 * The operational context for the assistant.
 */
export type RootContext = z.infer<typeof RootContext>;
export declare const RootContext: z.ZodLiteral<"security">;
/**
 * The role associated with the message in the chat.
 */
export type ChatMessageRole = z.infer<typeof ChatMessageRole>;
export declare const ChatMessageRole: z.ZodEnum<{
    user: "user";
    system: "system";
    assistant: "assistant";
}>;
export type ChatMessageRoleEnum = typeof ChatMessageRole.enum;
export declare const ChatMessageRoleEnum: {
    user: "user";
    system: "system";
    assistant: "assistant";
};
/**
 * ECS-style metadata attached to the message.
 */
export type MessageData = z.infer<typeof MessageData>;
export declare const MessageData: z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>;
/**
 * A message exchanged within the AI chat conversation.
 */
export type ChatMessage = z.infer<typeof ChatMessage>;
export declare const ChatMessage: z.ZodObject<{
    content: z.ZodOptional<z.ZodString>;
    role: z.ZodEnum<{
        user: "user";
        system: "system";
        assistant: "assistant";
    }>;
    data: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>>;
    fields_to_anonymize: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
/**
 * The request payload for creating a chat completion.
 */
export type ChatCompleteProps = z.infer<typeof ChatCompleteProps>;
export declare const ChatCompleteProps: z.ZodObject<{
    conversationId: z.ZodOptional<z.ZodString>;
    promptId: z.ZodOptional<z.ZodString>;
    isStream: z.ZodOptional<z.ZodBoolean>;
    responseLanguage: z.ZodOptional<z.ZodString>;
    langSmithProject: z.ZodOptional<z.ZodString>;
    langSmithApiKey: z.ZodOptional<z.ZodString>;
    connectorId: z.ZodString;
    model: z.ZodOptional<z.ZodString>;
    persist: z.ZodBoolean;
    messages: z.ZodArray<z.ZodObject<{
        content: z.ZodOptional<z.ZodString>;
        role: z.ZodEnum<{
            user: "user";
            system: "system";
            assistant: "assistant";
        }>;
        data: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>>;
        fields_to_anonymize: z.ZodOptional<z.ZodArray<z.ZodString>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type ChatCompleteRequestQuery = z.infer<typeof ChatCompleteRequestQuery>;
export declare const ChatCompleteRequestQuery: z.ZodObject<{
    content_references_disabled: z.ZodDefault<z.ZodOptional<z.ZodUnion<readonly [z.ZodPipe<z.ZodEnum<{
        true: "true";
        false: "false";
    }>, z.ZodTransform<boolean, "false" | "true">>, z.ZodBoolean]> & import("@kbn/zod-helpers/v4/kbn_zod_types/kbn_zod_type").KbnZodType>>;
}, z.core.$strip>;
export type ChatCompleteRequestQueryInput = z.input<typeof ChatCompleteRequestQuery>;
export type ChatCompleteRequestBody = z.infer<typeof ChatCompleteRequestBody>;
export declare const ChatCompleteRequestBody: z.ZodObject<{
    conversationId: z.ZodOptional<z.ZodString>;
    promptId: z.ZodOptional<z.ZodString>;
    isStream: z.ZodOptional<z.ZodBoolean>;
    responseLanguage: z.ZodOptional<z.ZodString>;
    langSmithProject: z.ZodOptional<z.ZodString>;
    langSmithApiKey: z.ZodOptional<z.ZodString>;
    connectorId: z.ZodString;
    model: z.ZodOptional<z.ZodString>;
    persist: z.ZodBoolean;
    messages: z.ZodArray<z.ZodObject<{
        content: z.ZodOptional<z.ZodString>;
        role: z.ZodEnum<{
            user: "user";
            system: "system";
            assistant: "assistant";
        }>;
        data: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>>;
        fields_to_anonymize: z.ZodOptional<z.ZodArray<z.ZodString>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type ChatCompleteRequestBodyInput = z.input<typeof ChatCompleteRequestBody>;
