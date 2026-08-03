import type { z, ZodObject } from '@kbn/zod/v4';
/**
 * Shared definition of a renderer type, common to the server and browser.
 */
export interface RendererDefinition<TType extends string = string, TSchema extends ZodObject<any> = ZodObject<any>> {
    /**
     * Unique identifier for the renderer type.
     */
    type: TType;
    /**
     * Zod schema that an agent-produced payload of this type is validated against.
     */
    payloadSchema: TSchema;
}
/**
 * The payload type for a renderer, inferred from its payload schema.
 */
export type RendererPayloadOf<TSchema extends ZodObject<any>> = z.infer<TSchema>;
