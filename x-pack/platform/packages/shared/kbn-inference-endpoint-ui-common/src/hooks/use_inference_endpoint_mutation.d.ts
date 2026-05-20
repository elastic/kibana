import type { HttpSetup } from '@kbn/core-http-browser';
import type { IToasts } from '@kbn/core/public';
import type { InferenceInferenceEndpointInfo } from '@elastic/elasticsearch/lib/api/types';
import type { InferenceEndpoint } from '../types/types';
export declare const addInferenceEndpoint: (http: HttpSetup, inferenceEndpoint: InferenceEndpoint) => Promise<InferenceInferenceEndpointInfo>;
export declare const updateInferenceEndpoint: (http: HttpSetup, inferenceEndpoint: InferenceEndpoint) => Promise<InferenceInferenceEndpointInfo>;
export declare const useInferenceEndpointMutation: (http: HttpSetup, toasts: IToasts, onSuccessCallback?: (inferenceId: string) => void) => {
    isLoading: boolean;
    mutate: (data: InferenceEndpoint, isEditing: boolean) => void;
};
