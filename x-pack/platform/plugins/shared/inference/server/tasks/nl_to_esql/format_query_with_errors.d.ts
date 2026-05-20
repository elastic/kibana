import type { EditorError } from '@elastic/esql/types';
import type { ESQLMessage } from '@kbn/esql-language';
export declare function formatQueryWithErrors(formattedQuery: string, errors: (ESQLMessage | EditorError)[]): string[];
