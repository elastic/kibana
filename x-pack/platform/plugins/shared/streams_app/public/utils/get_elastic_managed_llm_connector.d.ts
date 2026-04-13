import type { Connector } from '../hooks/use_genai_connectors';
export declare const INFERENCE_CONNECTOR_ACTION_TYPE_ID = ".inference";
export declare const getElasticManagedLlmConnector: (connectors: Connector[] | undefined) => Connector | undefined;
