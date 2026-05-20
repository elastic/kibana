import type { FC } from 'react';
import type { MlSavedObjectType } from '@kbn/ml-common-types/saved_objects';
interface Props {
    node?: string;
    type?: MlSavedObjectType;
    height?: string;
}
export declare const JobMemoryTreeMap: FC<Props>;
export {};
