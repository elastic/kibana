import type { ApplicationSetup, StartServicesAccessor } from '@kbn/core/public';
import type { SpacesManager } from '../spaces_manager';
interface CreateDeps {
    application: ApplicationSetup;
    spacesManager: SpacesManager;
    getStartServices: StartServicesAccessor;
}
export declare const spaceSelectorApp: Readonly<{
    id: "space_selector";
    create({ application, getStartServices, spacesManager }: CreateDeps): void;
}>;
export {};
