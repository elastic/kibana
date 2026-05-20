import type { FC } from 'react';
import type { MlSavedObjectType } from '@kbn/ml-common-types/saved_objects';
interface Props {
    mlSavedObjectType?: MlSavedObjectType;
    onCloseFlyout?: () => void;
    forceRefresh?: boolean;
}
export declare const SavedObjectsWarning: FC<Props>;
export {};
