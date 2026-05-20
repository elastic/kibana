import type { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
import { type StreamlangResolverOptions } from '../../../types/resolvers';
import type { StreamlangProcessorDefinition } from '../../../types/processors';
import type { IngestPipelineTranspilationOptions } from '.';
export declare function convertStreamlangDSLActionsToIngestPipelineProcessors(actionSteps: StreamlangProcessorDefinition[], transpilationOptions?: IngestPipelineTranspilationOptions, resolverOptions?: StreamlangResolverOptions): Promise<IngestProcessorContainer[]>;
