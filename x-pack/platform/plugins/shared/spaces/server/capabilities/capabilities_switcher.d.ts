import type { CapabilitiesSwitcher, CoreSetup, Logger } from '@kbn/core/server';
import type { PluginsStart } from '../plugin';
import type { SpacesServiceStart } from '../spaces_service';
export declare function setupCapabilitiesSwitcher(core: CoreSetup<PluginsStart>, getSpacesService: () => SpacesServiceStart, logger: Logger): CapabilitiesSwitcher;
