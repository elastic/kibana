import type { PackagePolicyInputStream } from '../../types';
/** Resolves `data_stream.dataset` stream var for otelcol; invalid shapes yield undefined. */
export declare function extractOtelDatasetVarOverride(raw: unknown): string | undefined;
/**
 * Effective `data_stream.dataset` for otelcol streams: merge `stream.data_stream` with
 * `compiled_stream.data_stream` (same object spread as `getFullInputStreams`), then apply
 * `data_stream.dataset` when the stream var resolves (aligns permissions and full agent policy).
 */
export declare function getEffectiveOtelStreamDataset(stream: PackagePolicyInputStream): string;
