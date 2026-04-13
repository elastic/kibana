import type { IngestStreamLifecycleDSL } from '@kbn/streams-schema';
import type { DslStepsFlyoutFormInternal } from './types';
export declare const createDslStepsFlyoutDeserializer: () => (lifecycle: IngestStreamLifecycleDSL) => DslStepsFlyoutFormInternal;
