import { type FC } from 'react';
interface CreateDataViewSwitchProps {
    canCreateDataView: boolean;
    createDataView: boolean;
    setCreateDataView: (d: boolean) => void;
}
export declare const CreateDataViewSwitch: FC<CreateDataViewSwitchProps>;
export {};
