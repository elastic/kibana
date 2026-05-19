import type { IScopedClusterClient } from '@kbn/core/server';
export declare function isAnnotationsFeatureAvailable({ asInternalUser }: IScopedClusterClient): Promise<boolean>;
