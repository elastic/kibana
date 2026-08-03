import type { CoreStart, KibanaRequest } from '@kbn/core/server';
import type { CopyOptions, CopyResponse } from './types';
export declare function copySavedObjectsToSpacesFactory(savedObjects: CoreStart['savedObjects'], request: KibanaRequest): (sourceSpaceId: string, destinationSpaceIds: string[], options: CopyOptions) => Promise<CopyResponse>;
