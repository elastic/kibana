import type { Feature } from '@kbn/streams-schema';
import React from 'react';
interface FeatureDetailsFlyoutProps {
    feature: Feature;
    onClose: () => void;
    onDelete?: () => Promise<void>;
    isDeleting?: boolean;
}
export declare function FeatureDetailsFlyout({ feature, onClose, onDelete, isDeleting, }: FeatureDetailsFlyoutProps): React.JSX.Element;
export {};
