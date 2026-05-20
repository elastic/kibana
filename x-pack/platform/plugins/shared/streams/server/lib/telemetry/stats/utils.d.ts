import type { IngestStreamLifecycle } from '@kbn/streams-schema';
import { type Streams } from '@kbn/streams-schema';
/**
 * If stream does not have a `IngestStreamLifecycleInherit`, retention has been changed
 */
export declare function hasChangedRetention(lifecycle: IngestStreamLifecycle | undefined): boolean;
/**
 * Returns true if a Classic stream has one or more processing steps
 */
export declare function hasProcessingSteps(definition: Streams.ClassicStream.Definition): boolean;
/**
 * Returns true if a Classic stream defines any field overrides
 */
export declare function hasFieldOverrides(definition: Streams.ClassicStream.Definition): boolean;
