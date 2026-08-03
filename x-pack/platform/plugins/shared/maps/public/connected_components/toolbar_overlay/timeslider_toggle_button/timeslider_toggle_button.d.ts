import React from 'react';
export interface Props {
    isTimesliderOpen: boolean;
    openTimeslider: () => void;
    closeTimeslider: () => void;
}
export declare function TimesliderToggleButton(props: Props): React.JSX.Element;
