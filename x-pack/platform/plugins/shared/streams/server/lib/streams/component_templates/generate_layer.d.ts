import type { ClusterPutComponentTemplateRequest } from '@elastic/elasticsearch/lib/api/types';
import type { Streams } from '@kbn/streams-schema';
export declare function generateLayer(name: string, definition: Streams.WiredStream.Definition, isServerless: boolean): ClusterPutComponentTemplateRequest;
