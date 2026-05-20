import type { FlattenRecord } from '@kbn/streams-schema';
export declare const PRIORITIZED_CONTENT_FIELDS: string[];
export declare const getDefaultTextField: (sampleDocs: FlattenRecord[], prioritizedFields: string[]) => string;
export declare const extractMessagesFromField: (samples: FlattenRecord[], fieldName: string) => string[];
