import type { CoreStart } from '@kbn/core/public';
import type { SpacesReactContext, SpacesReactContextValue } from './types';
import type { SpacesManager } from '../spaces_manager';
import type { SpacesData } from '../types';
export declare const useSpaces: <Services extends Partial<CoreStart>>() => SpacesReactContextValue<Services>;
export declare const createSpacesReactContext: <Services extends Partial<CoreStart>>(services: Services, spacesManager: SpacesManager, spacesDataPromise: Promise<SpacesData>) => SpacesReactContext<Services>;
