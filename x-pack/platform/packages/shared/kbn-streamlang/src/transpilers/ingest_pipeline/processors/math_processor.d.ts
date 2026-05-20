import type { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
import type { MathProcessor } from '../../../../types/processors';
/**
 * Converts a MathProcessor to an Ingest Pipeline script processor.
 *
 * @example
 * Input:
 *   { action: 'math', expression: 'price * quantity', to: 'total' }
 *
 * Output:
 *   { script: { lang: 'painless', source: "ctx['total'] = ctx['price'] * ctx['quantity']" } }
 */
export declare function processMathProcessor(processor: Omit<MathProcessor, 'where'> & {
    if?: string;
    tag?: string;
}): IngestProcessorContainer;
