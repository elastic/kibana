import React from 'react';
interface Props {
    color: string;
    onColorChange: ({ color }: {
        color: string;
    }) => void;
}
export declare function EMSVectorTileStyleEditor({ color, onColorChange }: Props): React.JSX.Element;
export {};
