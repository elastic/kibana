import type { Streams} from '@kbn/streams-schema';
import { type IngestStreamSettings } from '@kbn/streams-schema';
import type { BaseStream } from '@kbn/streams-schema/src/models/base';
import type { State } from '../state';
import type { ValidationResult } from '../stream_active_record/stream_active_record';
interface ComputeChangeOptions {
    /** Whether the stream already exists in the starting state */
    isExistingStream: boolean;
    /** Whether the new value is meaningful (non-empty/non-default) */
    hasMeaningfulValue: boolean;
    /** Whether the value changed compared to the starting state (only evaluated for existing streams) */
    hasChanged: () => boolean;
}
/**
 * Determines if a change flag should be set for a stream property.
 *
 * For existing streams (isExistingStream=true): returns true if the values are not equal (hasChanged)
 * For new streams (isExistingStream=false): returns true if the value is meaningful/non-empty (hasMeaningfulValue)
 */
export declare function computeChange({ isExistingStream, hasMeaningfulValue, hasChanged, }: ComputeChangeOptions): boolean;
export declare function classicIngestHasEsLevelChanges(ingest: Streams.ClassicStream.UpsertRequest['stream']['ingest']): boolean | undefined;
export declare function formatSettings(settings: IngestStreamSettings, isServerless: boolean): {
    'index.refresh_interval': string | -1 | null;
    'index.number_of_replicas'?: undefined;
    'index.number_of_shards'?: undefined;
} | {
    'index.number_of_replicas': number | null;
    'index.number_of_shards': number | null;
    'index.refresh_interval': string | -1 | null;
};
export type FormattedIngestSettings = ReturnType<typeof formatSettings>;
/**
 * Maps {@link formatSettings} output (flat `index.*` keys as used by put data stream settings)
 * into nested `template.settings.index` fields for composable index templates. Omits `null`
 * entries so cluster defaults apply.
 */
export declare function formattedIngestSettingsToTemplateIndexSettings(formatted: FormattedIngestSettings): {
    number_of_replicas?: number;
    number_of_shards?: number;
    refresh_interval?: string | -1;
};
export declare function settingsUpdateRequiresRollover(oldSettings: IngestStreamSettings, newSettings: IngestStreamSettings): boolean;
/**
 * Validates that the query streams are valid for the parent stream
 * @param name - The name of the parent stream
 * @param queryStreams - The query streams to validate
 * @param desiredState - The desired state of the streams
 * @returns A validation result if the query streams are invalid, otherwise undefined
 */
export declare const validateQueryStreams: ({ desiredState, name, queryStreams, }: {
    desiredState: State;
    name: string;
    queryStreams?: BaseStream.QueryStreamReference[];
}) => ValidationResult | undefined;
export {};
