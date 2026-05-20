import type { FunctionComponent } from 'react';
import type { Document } from '../../../../types';
interface Props {
    onAddDocuments: (document: Document) => void;
}
export declare const AddDocumentForm: FunctionComponent<Props>;
export {};
