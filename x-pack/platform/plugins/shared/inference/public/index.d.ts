import type { PluginInitializer } from '@kbn/core/public';
import type { InferencePublicSetup, InferencePublicStart, InferenceSetupDependencies, InferenceStartDependencies } from './types';
export type { InferencePublicSetup, InferencePublicStart };
export declare const plugin: PluginInitializer<InferencePublicSetup, InferencePublicStart, InferenceSetupDependencies, InferenceStartDependencies>;
