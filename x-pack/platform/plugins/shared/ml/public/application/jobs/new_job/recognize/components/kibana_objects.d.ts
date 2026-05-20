import type { FC } from 'react';
import type { KibanaObjectUi } from '../page';
export interface KibanaObjectItemProps {
    objectType: string;
    kibanaObjects: KibanaObjectUi[] | undefined;
    isSaving: boolean;
}
export declare const KibanaObjectList: FC<KibanaObjectItemProps>;
