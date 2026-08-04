import React from 'react';
import type { ClosureType } from '../../containers/configure/types';
export interface ClosureOptionsRadioComponentProps {
    closureTypeSelected: ClosureType;
    disabled: boolean;
    onChangeClosureType: (newClosureType: ClosureType) => void;
}
export declare const ClosureOptionsRadio: React.NamedExoticComponent<ClosureOptionsRadioComponentProps>;
