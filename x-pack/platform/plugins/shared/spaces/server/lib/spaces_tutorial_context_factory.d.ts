import type { KibanaRequest } from '@kbn/core/server';
import type { SpacesServiceStart } from '../spaces_service/spaces_service';
export declare function createSpacesTutorialContextFactory(getSpacesService: () => SpacesServiceStart): (request: KibanaRequest) => {
    spaceId: import("@kbn/core/packages/spaces/common").SpaceId;
    isInDefaultSpace: boolean;
};
