import type { KibanaRequest } from '@kbn/core/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
export declare function spacesUtilsProvider(getSpacesPlugin: (() => Promise<SpacesPluginStart>) | undefined, request: KibanaRequest): {
    isMlEnabledInSpace: () => Promise<boolean>;
    getAllSpaces: () => Promise<import("@kbn/spaces-plugin/server").GetSpaceResult[] | null>;
    getAllSpaceIds: () => Promise<string[] | null>;
    getMlSpaceIds: () => Promise<string[] | null>;
    getCurrentSpaceId: () => Promise<string | null>;
};
