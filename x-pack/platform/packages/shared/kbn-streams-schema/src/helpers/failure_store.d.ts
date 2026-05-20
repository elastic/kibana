import type { Streams } from '../models/streams';
import type { WiredIngestStreamEffectiveFailureStore } from '../models/ingest/failure_store';
export declare function findInheritedFailureStore(definition: Streams.WiredStream.Definition, ancestors: Streams.WiredStream.Definition[]): WiredIngestStreamEffectiveFailureStore;
