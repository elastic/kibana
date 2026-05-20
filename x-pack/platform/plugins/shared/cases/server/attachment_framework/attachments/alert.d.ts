import { z } from '@kbn/zod/v4';
import type { UnifiedAttachmentTypeSetup } from '../types';
export declare const stackAlertAttachmentType: UnifiedAttachmentTypeSetup;
export declare const StackAlertAttachmentMetadataRt: z.ZodObject<{
    index: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>]>>;
    rule: z.ZodOptional<z.ZodUnion<readonly [z.ZodNull, z.ZodObject<{
        id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>]>>;
}, z.core.$strip>;
export type StackAlertAttachmentMetadata = z.infer<typeof StackAlertAttachmentMetadataRt>;
/**
 * Decodes and validates stack alert attachment metadata.
 * Throws `ZodError` on failure; callers can surface this as `badRequest` at
 * the boundary if desired.
 */
export declare const decodeStackAlertAttachmentMetadata: (metadata: unknown) => StackAlertAttachmentMetadata;
