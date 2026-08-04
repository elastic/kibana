import type { SpacesServiceStart } from '../../../spaces_service/spaces_service';
import type { SpacesRouter } from '../../../types';
export interface InternalRouteDeps {
    router: SpacesRouter;
    getSpacesService: () => SpacesServiceStart;
}
export declare function initInternalSpacesApi(deps: InternalRouteDeps): void;
