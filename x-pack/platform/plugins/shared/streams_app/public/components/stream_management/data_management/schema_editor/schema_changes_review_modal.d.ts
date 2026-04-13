import React from 'react';
import { Streams } from '@kbn/streams-schema';
import type { SchemaEditorField } from './types';
interface SchemaChangesReviewModalProps {
    onClose: () => void;
    streamType?: 'wired' | 'classic' | 'query' | 'unknown';
    definition: Streams.ingest.all.GetResponse;
    fields: SchemaEditorField[];
    storedFields: SchemaEditorField[];
    submitChanges: () => Promise<void>;
}
export declare function SchemaChangesReviewModal({ fields, streamType, definition, storedFields, submitChanges, onClose, }: SchemaChangesReviewModalProps): React.JSX.Element;
export declare function getChanges(fields: SchemaEditorField[], storedFields: SchemaEditorField[]): SchemaEditorField[];
export {};
