import { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { CasesStepBaseConfigSchema, CasesStepSingleCaseOutputSchema } from './shared';
export declare const AddAttachmentsStepTypeId = "cases.addAttachments";
/**
 * Composes the per-attachment-type discriminated union from registered
 * full-payload zod schemas. `owner` is stripped because the workflow step
 * injects it from the target case, not the YAML author.
 */
export declare const composeAttachmentUnion: (members: z.ZodObject[]) => z.ZodDiscriminatedUnion;
export declare const buildAddAttachmentsStepCommonDefinition: (members: z.ZodObject[]) => CommonStepDefinition<ReturnType<typeof buildAddAttachmentsInputSchema>, typeof CasesStepSingleCaseOutputSchema, typeof CasesStepBaseConfigSchema>;
export declare const buildAddAttachmentsInputSchema: (members: z.ZodObject[]) => z.ZodObject<{
    case_id: z.ZodString;
    attachments: z.ZodArray<z.ZodDiscriminatedUnion<readonly z.core.$ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>[], string>>;
}, z.core.$strip>;
export type AddAttachmentsStepInput = z.infer<ReturnType<typeof buildAddAttachmentsInputSchema>>;
