import { type FC } from 'react';
interface UseIdAsIndexNameSwitchProps {
    destIndexSameAsId: boolean;
    isJobCreated: boolean;
    setDestIndexSameAsId: (d: boolean) => void;
    label: string;
}
export declare const UseIdAsIndexNameSwitch: FC<UseIdAsIndexNameSwitchProps>;
export {};
