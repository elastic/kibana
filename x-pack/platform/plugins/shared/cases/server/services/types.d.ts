import type { SavedObject, SavedObjectsCreateOptions } from '@kbn/core/server';
import type { PartialField } from '../types';
export type RefreshSetting = NonNullable<SavedObjectsCreateOptions['refresh']>;
export interface IndexRefresh {
    refresh?: SavedObjectsCreateOptions['refresh'];
}
export type OptionalAttributes<T> = PartialField<SavedObject<T>, 'attributes'>;
