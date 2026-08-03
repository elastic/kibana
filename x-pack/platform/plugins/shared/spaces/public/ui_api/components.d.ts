import type { StartServicesAccessor } from '@kbn/core/public';
import type { SpacesApiUiComponent } from './types';
import type { PluginsStart } from '../plugin';
import type { SpacesManager } from '../spaces_manager';
export interface GetComponentsOptions {
    spacesManager: SpacesManager;
    getStartServices: StartServicesAccessor<PluginsStart>;
}
export declare const getComponents: ({ spacesManager, getStartServices, }: GetComponentsOptions) => SpacesApiUiComponent;
