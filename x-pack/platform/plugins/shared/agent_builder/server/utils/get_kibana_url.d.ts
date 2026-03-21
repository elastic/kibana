import type { CoreSetup, KibanaRequest } from '@kbn/core/server';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
export declare function getKibanaUrl(coreSetup: CoreSetup, cloudSetup?: CloudSetup, request?: KibanaRequest, spaces?: SpacesPluginStart): string;
export declare function getFallbackKibanaUrl({ http }: CoreSetup): string;
