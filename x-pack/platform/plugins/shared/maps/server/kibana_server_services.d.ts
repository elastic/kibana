import type { CoreStart } from '@kbn/core/server';
export declare function setStartServices(core: CoreStart): void;
export declare const getSavedObjectClient: (extraTypes?: string[]) => import("@kbn/core/server").ISavedObjectsRepository;
