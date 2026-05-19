import type { ContentManagementCrudTypes, SavedObjectCreateOptions, SavedObjectUpdateOptions } from '@kbn/content-management-utils';
import type { MapContentType } from '../types';
import type { MapAttributes } from '../../../server';
export type MapCrudTypes = ContentManagementCrudTypes<MapContentType, MapAttributes, Pick<SavedObjectCreateOptions, 'references'>, Pick<SavedObjectUpdateOptions, 'references'>, {
    /** Flag to indicate to only search the text on the "title" field */
    onlyTitle?: boolean;
}>;
