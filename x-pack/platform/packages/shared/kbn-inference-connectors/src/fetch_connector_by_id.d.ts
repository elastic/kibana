import type { HttpSetup } from '@kbn/core-http-browser';
import type { AIConnector } from './types';
export declare const fetchConnectorById: (http: HttpSetup, connectorId: string) => Promise<AIConnector | undefined>;
