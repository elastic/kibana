import React from 'react';
import type { ClosureType } from '../../containers/configure/types';
export interface ClosureOptionsProps {
    closureTypeSelected: ClosureType;
    disabled: boolean;
    onChangeClosureType: (newClosureType: ClosureType) => void;
}
export declare const ClosureOptions: React.NamedExoticComponent<ClosureOptionsProps>;
