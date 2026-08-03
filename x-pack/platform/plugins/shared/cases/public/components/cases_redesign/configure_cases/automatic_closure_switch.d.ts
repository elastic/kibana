import React from 'react';
import type { ClosureType } from '../../../containers/configure/types';
export interface AutomaticClosureSwitchProps {
    closureTypeSelected: ClosureType;
    disabled: boolean;
    onChangeClosureType: (newClosureType: ClosureType) => void;
}
export declare const AutomaticClosureSwitch: React.NamedExoticComponent<AutomaticClosureSwitchProps>;
