import type { WiredIngestStreamEffectiveSettings } from '../models/ingest/settings';
import type { Streams } from '../models/streams';
export declare const getInheritedSettings: (ancestors: Streams.WiredStream.Definition[]) => WiredIngestStreamEffectiveSettings;
