import { type EuiFlyoutProps } from '@elastic/eui';
import type { InferenceTaskType } from '@elastic/elasticsearch/lib/api/types';
import React from 'react';
import type { HttpSetup, IToasts } from '@kbn/core/public';
import type { InferenceEndpoint } from '../types/types';
export declare const formSerializer: (formData: InferenceEndpoint) => InferenceEndpoint;
interface InferenceFlyoutWrapperProps {
    onFlyoutClose: () => void;
    http: HttpSetup;
    toasts: IToasts;
    isEdit?: boolean;
    enforceAdaptiveAllocations?: boolean;
    onSubmitSuccess?: (inferenceId: string) => void;
    inferenceEndpoint?: InferenceEndpoint;
    focusTrapProps?: EuiFlyoutProps['focusTrapProps'];
    /** When set, only these task types will be available for selection in the form. */
    allowedTaskTypes?: InferenceTaskType[];
    /** When set, providers matching these service keys will be hidden from the selectable list. */
    excludeProviders?: string[];
}
export declare const InferenceFlyoutWrapper: React.FC<InferenceFlyoutWrapperProps>;
export {};
