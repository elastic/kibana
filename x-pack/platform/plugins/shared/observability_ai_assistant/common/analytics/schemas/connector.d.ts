import type { RootSchema } from '@kbn/core/public';
import type { InferenceConnector } from '../../utils/get_inference_connector';
export interface Connector {
    connector: InferenceConnector | undefined;
}
export declare const connectorSchema: RootSchema<Connector['connector']>;
