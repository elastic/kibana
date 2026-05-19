import React from 'react';
interface Props {
    minFontSize: number;
    maxFontSize: number;
    onChange: (minFontSize: number, maxFontSize: number) => void;
}
export declare function FontSizeInput(props: Props): React.JSX.Element;
export {};
