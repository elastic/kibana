import type { RendererTypeDefinition } from '../renderers';
/**
 * Renderer service exposed on the agent handler context, giving agent
 * execution read access to the renderer types registered in agentBuilder.
 */
export interface RenderersService {
    getRegisteredRenderers(): RendererTypeDefinition[];
    getRenderer(type: string): RendererTypeDefinition | undefined;
}
