import type { Payload } from '@hapi/boom';
import Boom from '@hapi/boom';
import type { SavedObjectsImportError } from '@kbn/core/server';
export declare const createEmptyFailureResponse: (errors?: Array<SavedObjectsImportError | Boom.Boom>) => {
    success: boolean;
    successCount: number;
    errors: (Payload | SavedObjectsImportError)[];
};
