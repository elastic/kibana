import type { CoreStart } from '@kbn/core/public';
import type { EventTracker } from '../analytics';
import type { ConfigType } from '../config';
import type { SpacesManager } from '../spaces_manager';
export declare function initSpacesNavControl(spacesManager: SpacesManager, core: CoreStart, config: ConfigType, eventTracker: EventTracker): void;
