import type { CoreSetup, Logger } from '@kbn/core/server';
import type { PluginsStart } from '../plugin';
import type { SpacesServiceStart } from '../spaces_service';
export declare const setupCapabilities: (core: CoreSetup<PluginsStart>, getSpacesService: () => SpacesServiceStart, logger: Logger) => void;
