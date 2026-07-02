import type { InferenceConnector } from '@kbn/inference-common';
import type { InferenceAdapterChatCompleteOptions } from '../../types';
export type CreateOpenAIRequestOptions = Omit<InferenceAdapterChatCompleteOptions, 'logger' | 'abortSignal' | 'executor' | 'functionCalling'> & {
    connector: InferenceConnector;
    simulatedFunctionCalling: boolean;
};
