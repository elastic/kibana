import type { FC } from 'react';
import type { InferenceInferenceEndpointInfo } from '@elastic/elasticsearch/lib/api/types';
export interface InferenceAPITabProps {
    inferenceApis: InferenceInferenceEndpointInfo[];
}
export declare const InferenceApi: FC<InferenceAPITabProps>;
