import type { IngestStreamLifecycleDSL } from '@kbn/streams-schema';
import type { DslStepsFlyoutFormInternal } from './types';
export declare const createDslStepsFlyoutSerializer: (initialLifecycle: IngestStreamLifecycleDSL) => (data: DslStepsFlyoutFormInternal) => IngestStreamLifecycleDSL;
