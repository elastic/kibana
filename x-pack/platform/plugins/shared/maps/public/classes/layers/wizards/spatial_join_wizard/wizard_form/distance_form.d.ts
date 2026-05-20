import React from 'react';
export declare const KM_ABBREVIATION: string;
interface Props {
    initialDistance: number;
    onClose: () => void;
    onDistanceChange: (distance: number) => void;
}
export declare function DistanceForm(props: Props): React.JSX.Element;
export {};
