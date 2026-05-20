import type { MakeSchemaFrom } from '@kbn/usage-collection-plugin/server';
import type { StreamsStatsTelemetry } from './types';
/**
 * Schema definition for Streams Stats telemetry (stack stats/snapshot telemetry)
 */
export declare const streamsStatsSchema: MakeSchemaFrom<StreamsStatsTelemetry>;
