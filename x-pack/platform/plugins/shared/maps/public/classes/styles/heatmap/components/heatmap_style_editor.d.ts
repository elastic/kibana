import React from 'react';
interface Props {
    colorRampName: string;
    onHeatmapColorChange: ({ colorRampName }: {
        colorRampName: string;
    }) => void;
}
export declare function HeatmapStyleEditor({ colorRampName, onHeatmapColorChange }: Props): React.JSX.Element;
export {};
