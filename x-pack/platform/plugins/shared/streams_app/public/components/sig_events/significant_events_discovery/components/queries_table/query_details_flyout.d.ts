import React from 'react';
import type { SignificantEventItem } from '../../../../hooks/use_fetch_significant_events';
interface QueryDetailsFlyoutProps {
    item: SignificantEventItem;
    isSaving: boolean;
    isDeleting: boolean;
    onClose: () => void;
    onSave: (updatedQuery: SignificantEventItem['query'], streamName: string) => Promise<void>;
    onDelete: (queryId: string, streamName: string) => Promise<void>;
}
export declare function QueryDetailsFlyout({ item, isSaving, isDeleting, onClose, onSave, onDelete, }: QueryDetailsFlyoutProps): React.JSX.Element;
export {};
