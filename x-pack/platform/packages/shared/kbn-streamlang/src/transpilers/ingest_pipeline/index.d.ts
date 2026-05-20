import type { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
import type { StreamlangResolverOptions } from '../../../types/resolvers';
import type { StreamlangDSL } from '../../../types/streamlang';
export interface IngestPipelineTranspilationOptions {
    ignoreMalformed?: boolean;
    traceCustomIdentifiers?: boolean;
}
export interface IngestPipelineTranspilationResult {
    processors: IngestProcessorContainer[];
}
export declare const transpile: (streamlang: StreamlangDSL, transpilationOptions?: IngestPipelineTranspilationOptions, resolverOptions?: StreamlangResolverOptions) => Promise<IngestPipelineTranspilationResult>;
