import type { RendererServiceStartContract } from '@kbn/agent-builder-browser';
import type { RenderersService } from './renderers_service';
export declare const createPublicRenderersContract: ({ renderersService, }: {
    renderersService: RenderersService;
}) => RendererServiceStartContract;
