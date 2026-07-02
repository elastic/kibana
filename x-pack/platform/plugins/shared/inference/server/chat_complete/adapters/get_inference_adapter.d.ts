import { InferenceConnectorType } from '@kbn/inference-common';
import type { InferenceConnectorAdapter } from '../types';
export declare const getInferenceAdapter: (connectorType: InferenceConnectorType) => InferenceConnectorAdapter | undefined;
