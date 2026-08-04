import type { CapabilitiesSwitcher, CoreSetup, Logger } from '@kbn/core/server';
import type { SpacesServiceStart } from '../spaces_service';
import type { SpacesPluginStartDeps } from '../types';
export declare function setupCapabilitiesSwitcher(core: CoreSetup<SpacesPluginStartDeps>, getSpacesService: () => SpacesServiceStart, logger: Logger): CapabilitiesSwitcher;
