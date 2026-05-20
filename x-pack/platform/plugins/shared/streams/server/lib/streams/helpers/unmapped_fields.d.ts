import type { Streams } from '@kbn/streams-schema';
import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
export declare const UNMAPPED_SAMPLE_SIZE = 500;
/**
 * Given a stream definition, its ancestors, and a set of sample documents,
 * returns the list of field names present in _source but not in any stream
 * mapping. Correctly excludes geo_point sub-fields (.lat / .lon).
 */
export declare const getUnmappedFields: ({ definition, ancestors, sampleDocs, }: {
    definition: Streams.all.Definition;
    ancestors: Streams.WiredStream.Definition[];
    sampleDocs: SearchResponse;
}) => string[];
