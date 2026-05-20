import type { AIConnector } from '@kbn/inference-connectors';
interface UseDefaultConnectorParams {
    connectors: AIConnector[];
    defaultConnectorId?: string;
}
export declare function useDefaultConnector({ connectors, defaultConnectorId, }: UseDefaultConnectorParams): string | undefined;
export {};
