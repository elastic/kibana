import type { Dispatch, FC } from 'react';
import React from 'react';
interface IntervalTimerangeSelectorProps {
    setAddIntervalTimerange: Dispatch<React.SetStateAction<boolean>>;
    addIntervalTimerange: boolean;
    disabled: boolean;
}
export declare const IntervalTimerangeSelector: FC<IntervalTimerangeSelectorProps>;
export {};
