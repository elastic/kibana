import type { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ConcatProcessor } from '../../../../types/processors';
/**
 * Converts a ConcatProcessor to an Ingest Pipeline script processor.
 *
 * @example
 * Input:
    {
        action: 'concat',
        from: [
            { type: 'field', value: 'first_name' },
            { type: 'literal', value: ' ' },
            { type: 'field', value: 'last_name' }
        ],
        to: 'full_name',
      }

 * Output:
    {
        script: {
            source: 'ctx[\'full_name\'] = ctx[\'first_name\'] + " " + ctx[\'last_name\'];',
            lang: 'painless',
        }
    }
 */
export declare const processConcatProcessor: (processor: Omit<ConcatProcessor, "where" | "action" | "to"> & {
    if?: string;
    field: string;
    tag?: string;
}) => IngestProcessorContainer;
