import type { StartServicesAccessor } from '@kbn/core/public';
import type { LazyComponentFn, SpacesApiUi, SpacesApiUiComponent } from './types';
import type { PluginsStart } from '../plugin';
import type { SpacesManager } from '../spaces_manager';
interface GetUiApiOptions {
    spacesManager: SpacesManager;
    getStartServices: StartServicesAccessor<PluginsStart>;
}
export type { LazyComponentFn, SpacesApiUi, SpacesApiUiComponent };
export declare const getUiApi: ({ spacesManager, getStartServices }: GetUiApiOptions) => SpacesApiUi;
