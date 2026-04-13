import type { AttachmentType } from '@kbn/streams-plugin/server/lib/streams/attachments/types';
import React from 'react';
export interface AttachmentFiltersState {
    query: string;
    debouncedQuery: string;
    types: AttachmentType[];
    tags: string[];
}
export declare const DEFAULT_ATTACHMENT_FILTERS: AttachmentFiltersState;
interface AttachmentFiltersProps {
    filters: AttachmentFiltersState;
    onFiltersChange: (updater: AttachmentFiltersState | ((prev: AttachmentFiltersState) => AttachmentFiltersState)) => void;
    searchPlaceholder: string;
}
export declare function AttachmentFilters({ filters, onFiltersChange, searchPlaceholder, }: AttachmentFiltersProps): React.JSX.Element;
export {};
