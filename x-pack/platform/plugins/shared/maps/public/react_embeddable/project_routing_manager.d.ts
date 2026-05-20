import type { ProjectRoutingOverrides } from '@kbn/presentation-publishing';
import { BehaviorSubject } from 'rxjs';
import type { SavedMap } from '../routes';
export declare function initializeProjectRoutingManager(savedMap: SavedMap): Promise<{
    api: {
        projectRoutingOverrides$: BehaviorSubject<ProjectRoutingOverrides>;
    };
    cleanup: () => void;
}>;
