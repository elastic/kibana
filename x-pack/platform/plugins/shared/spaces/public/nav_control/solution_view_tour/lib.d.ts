import type { CoreStart } from '@kbn/core/public';
import type { SpacesManager } from '../../spaces_manager';
export declare function initTour(core: CoreStart, spacesManager: SpacesManager): {
    showTour$: import("rxjs").Observable<boolean>;
    onFinishTour: () => void;
};
