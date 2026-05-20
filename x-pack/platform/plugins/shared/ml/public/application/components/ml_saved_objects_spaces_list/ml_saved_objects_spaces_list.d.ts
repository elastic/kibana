import type { FC } from 'react';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { MlSavedObjectType } from '@kbn/ml-common-types/saved_objects';
interface Props {
    spacesApi: SpacesPluginStart;
    spaceIds?: string[];
    id: string;
    mlSavedObjectType: MlSavedObjectType;
    refresh(): void;
    disabled?: boolean;
}
export declare const MLSavedObjectsSpacesList: FC<Props>;
export {};
