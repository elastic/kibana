import type { PluginConfigDescriptor, PluginInitializer } from '@kbn/core/server';
import type { InferenceConfig } from './config';
import type { InferenceServerSetup, InferenceServerStart, InferenceSetupDependencies, InferenceStartDependencies } from './types';
export type { InferenceServerSetup, InferenceServerStart };
export type { InferenceEndpoint } from './util/get_inference_endpoints';
export { naturalLanguageToEsql, EsqlDocumentBase, runAndValidateEsqlQuery, } from './tasks/nl_to_esql';
export declare const plugin: PluginInitializer<InferenceServerSetup, InferenceServerStart, InferenceSetupDependencies, InferenceStartDependencies>;
export declare const config: PluginConfigDescriptor<InferenceConfig>;
