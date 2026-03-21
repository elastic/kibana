import type { ESQLMessage, EditorError } from '@elastic/esql/types';
export declare function formatQueryWithErrors(formattedQuery: string, errors: (ESQLMessage | EditorError)[]): string[];
