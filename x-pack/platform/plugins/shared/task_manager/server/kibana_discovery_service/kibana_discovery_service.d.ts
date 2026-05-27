import type { ISavedObjectsRepository } from '@kbn/core/server';
import type { Logger } from '@kbn/core/server';
import type { TaskManagerConfig } from '../config';
interface DiscoveryServiceParams {
    config: TaskManagerConfig['discovery'];
    currentNode: string;
    savedObjectsRepository: ISavedObjectsRepository;
    logger: Logger;
    onNodesCounted?: (numOfNodes: number) => void;
}
export declare const DEFAULT_TIMEOUT = 2000;
export declare class KibanaDiscoveryService {
    private readonly activeNodesLookBack;
    private readonly discoveryInterval;
    private currentNode;
    private started;
    private savedObjectsRepository;
    private logger;
    private stopped;
    private timer;
    private onNodesCounted?;
    constructor(opts: DiscoveryServiceParams);
    private upsertCurrentNode;
    private scheduleUpsertCurrentNode;
    isStarted(): boolean;
    start(): Promise<void>;
    getActiveKibanaNodes(): Promise<import("@kbn/core/server").SavedObjectsFindResult<Readonly<{} & {
        id: string;
        last_seen: string;
    }>>[]>;
    deleteCurrentNode(): Promise<void>;
    stop(): void;
}
export {};
