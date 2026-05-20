import type { CoreSetup } from '@kbn/core/server';
import type { SpacesServiceStart } from '../spaces_service';
interface SetupDeps {
    core: Pick<CoreSetup, 'savedObjects' | 'getStartServices'>;
    getSpacesService: () => SpacesServiceStart;
}
export declare class SpacesSavedObjectsService {
    setup({ core, getSpacesService }: SetupDeps): void;
}
export {};
