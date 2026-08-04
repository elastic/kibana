import React from 'react';
export interface FillOpacityOptionProps {
    /**
     * Currently selected value
     */
    value: number;
    /**
     * Callback on display option change
     */
    onChange: (value: number) => void;
    /**
     * Flag for rendering or not the component
     */
    isFillOpacityEnabled?: boolean;
}
export declare const FillOpacityOption: React.FC<FillOpacityOptionProps>;
