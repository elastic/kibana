import type { FC } from 'react';
import React from 'react';
import type { MlSavedObjectType } from '@kbn/ml-common-types/saved_objects';
interface Props {
    canDeleteCallback: () => void;
    onCloseCallback: () => void;
    refreshJobsCallback?: () => void;
    mlSavedObjectType: MlSavedObjectType;
    ids: string[];
    setDidUntag?: React.Dispatch<React.SetStateAction<boolean>>;
    hasManagedJob?: boolean;
    onUntagCallback?: () => void;
}
export declare const DeleteSpaceAwareItemCheckModal: FC<Props>;
export {};
