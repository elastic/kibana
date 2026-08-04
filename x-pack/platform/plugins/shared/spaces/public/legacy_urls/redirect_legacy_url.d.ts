import type { StartServicesAccessor } from '@kbn/core/public';
import type { PluginsStart } from '../plugin';
import type { SpacesApiUi } from '../ui_api';
export declare function createRedirectLegacyUrl(getStartServices: StartServicesAccessor<PluginsStart>): SpacesApiUi['redirectLegacyUrl'];
