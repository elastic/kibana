import type { CoreStart, KibanaRequest } from '@kbn/core/server';
import type { CopyResponse, ResolveConflictsOptions } from './types';
export declare function resolveCopySavedObjectsToSpacesConflictsFactory(savedObjects: CoreStart['savedObjects'], request: KibanaRequest): (sourceSpaceId: string, options: ResolveConflictsOptions) => Promise<CopyResponse>;
