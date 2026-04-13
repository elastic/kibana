import type { Feature } from '@kbn/streams-schema';
import React from 'react';
interface DeleteFeatureModalProps {
    features: Feature[];
    onConfirm: () => void;
    onCancel: () => void;
    isLoading?: boolean;
}
export declare function DeleteFeatureModal({ features, onConfirm, onCancel, isLoading, }: DeleteFeatureModalProps): React.JSX.Element;
export {};
