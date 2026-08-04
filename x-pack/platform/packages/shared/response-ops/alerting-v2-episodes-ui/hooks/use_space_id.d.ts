import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
/** Subscribes to `services.spaces.getActiveSpace$()` and returns the active space id. */
export declare const useSpaceId: (spaces: SpacesPluginStart) => string;
