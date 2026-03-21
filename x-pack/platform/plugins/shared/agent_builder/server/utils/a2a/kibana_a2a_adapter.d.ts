import type { KibanaRequest, KibanaResponseFactory, IKibanaResponse } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { InternalStartServices } from '../../services';
/**
 * Kibana adapter for the A2A SDK
 */
export declare class KibanaA2AAdapter {
    private logger;
    private getInternalServices;
    private getBaseUrl;
    constructor(logger: Logger, getInternalServices: () => InternalStartServices, getBaseUrl: (request: KibanaRequest) => Promise<string>);
    /**
     * Create A2A components for a specific agent and request
     */
    private createA2AComponents;
    /**
     * Handle agent card requests
     */
    handleAgentCardRequest(req: KibanaRequest, res: KibanaResponseFactory, agentId: string): Promise<IKibanaResponse>;
    /**
     * Handle A2A JSON-RPC requests
     */
    handleA2ARequest(req: KibanaRequest, res: KibanaResponseFactory, agentId: string): Promise<IKibanaResponse>;
    /**
     * Handle unsupported methods
     */
    handleUnsupportedRequest(req: KibanaRequest, res: KibanaResponseFactory): Promise<IKibanaResponse>;
}
