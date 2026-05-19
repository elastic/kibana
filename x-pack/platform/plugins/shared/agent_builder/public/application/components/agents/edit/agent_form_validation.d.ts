import { z } from '@kbn/zod/v4';
/**
 * Validates an avatar symbol value.
 * Allows: 1 emoji, 1 letter, or 2 letters.
 * Disallows: 2+ emojis, emoji + letter combinations, 3+ characters.
 */
export declare const isValidAvatarSymbol: (value: string) => boolean;
/**
 * Truncates an avatar symbol value to valid length.
 * If first character is emoji, keeps only that emoji.
 * Otherwise, keeps up to 2 characters.
 */
export declare const truncateAvatarSymbol: (value: string) => string;
export declare const agentFormSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodString;
    visibility: z.ZodEnum<{
        public: "public";
        private: "private";
        shared: "shared";
    }>;
    labels: z.ZodOptional<z.ZodArray<z.ZodString>>;
    avatar_color: z.ZodOptional<z.ZodString>;
    avatar_symbol: z.ZodOptional<z.ZodString>;
    configuration: z.ZodObject<{
        instructions: z.ZodOptional<z.ZodString>;
        tools: z.ZodArray<z.ZodObject<{
            tool_ids: z.ZodArray<z.ZodString>;
        }, z.core.$strip>>;
        skill_ids: z.ZodOptional<z.ZodArray<z.ZodString>>;
        enable_elastic_capabilities: z.ZodOptional<z.ZodBoolean>;
        workflow_ids: z.ZodOptional<z.ZodArray<z.ZodString>>;
        plugin_ids: z.ZodOptional<z.ZodArray<z.ZodString>>;
    }, z.core.$strip>;
}, z.core.$strip>;
