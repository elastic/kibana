import type { Streams } from '@kbn/streams-schema';
export type FieldConvention = 'otel' | 'ecs';
export declare const getStreamConvention: (definition: Streams.all.Definition) => FieldConvention;
export declare const getConventionHint: (convention: FieldConvention) => string;
