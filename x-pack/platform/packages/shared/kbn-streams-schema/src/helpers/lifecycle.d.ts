import type { Streams } from '../models/streams';
import type { IngestStreamEffectiveLifecycle, IngestStreamLifecycleAll, WiredIngestStreamEffectiveLifecycle } from '../models/ingest/lifecycle';
export declare function findInheritedLifecycle(definition: Streams.WiredStream.Definition, ancestors: Streams.WiredStream.Definition[]): WiredIngestStreamEffectiveLifecycle;
export declare function findInheritingStreams(root: Streams.WiredStream.Definition, descendants: Streams.WiredStream.Definition[]): string[];
export declare function effectiveToIngestLifecycle(effectiveLifecycle: IngestStreamEffectiveLifecycle): IngestStreamLifecycleAll;
