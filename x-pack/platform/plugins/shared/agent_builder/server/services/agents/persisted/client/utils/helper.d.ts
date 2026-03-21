import type { Document } from '../converters';
export declare const hasRequiredDocumentFields: (document: Document | undefined) => document is Required<Document>;
