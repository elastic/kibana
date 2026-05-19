import React from 'react';
interface Props {
    value: number;
    onChange: (size: number) => void;
}
export declare function SizeSlider({ onChange, value }: Props): React.JSX.Element;
export {};
