import type { FC, CSSProperties } from 'react';
interface Props {
    radius: number;
    circleCenterX: number;
    circleTopY: number;
    textOffset: number;
    textY: number;
    formattedValue: string | number;
    circleCenterY: number;
    circleStyle: CSSProperties;
    onWidthChange: (width: number) => void;
}
export declare const MapMarker: FC<Props>;
export {};
