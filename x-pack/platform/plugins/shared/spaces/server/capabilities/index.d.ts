import type { CoreSetup, Logger } from '@kbn/core/server';
import type { SpacesServiceStart } from '../spaces_service';
import type { SpacesPluginStartDeps } from '../types';
export declare const setupCapabilities: (core: CoreSetup<SpacesPluginStartDeps>, getSpacesService: () => SpacesServiceStart, logger: Logger) => void;
