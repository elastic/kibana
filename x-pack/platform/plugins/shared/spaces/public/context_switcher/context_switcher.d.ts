import type { CloudStart } from '@kbn/cloud-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { SpacesManager } from '../spaces_manager';
export declare function initContextSwitcher(spacesManager: SpacesManager, core: CoreStart, allowSolutionVisibility: boolean, cloud?: CloudStart, isServerless?: boolean): void;
