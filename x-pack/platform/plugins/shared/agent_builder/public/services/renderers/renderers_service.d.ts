import type { ZodObject } from '@kbn/zod/v4';
import type { RendererUIDefinition } from '@kbn/agent-builder-browser';
/**
 * Internal service maintaining a registry of renderer UI definitions, keyed by
 * renderer type.
 */
export declare class RenderersService {
    private readonly registry;
    /**
     * Registers a UI definition for a renderer type.
     *
     * @param definition - The UI definition; the renderer type is taken from `definition.type`.
     * @throws Error if a renderer for the type is already registered.
     */
    register<TSchema extends ZodObject<any> = ZodObject<any>>(definition: RendererUIDefinition<TSchema>): void;
    /**
     * Retrieves the UI definition for a renderer type, or `undefined` if none is registered.
     */
    getRendererUiDefinition(type: string): RendererUIDefinition | undefined;
    /**
     * Checks whether a UI definition is registered for the given renderer type.
     */
    hasRenderer(type: string): boolean;
}
