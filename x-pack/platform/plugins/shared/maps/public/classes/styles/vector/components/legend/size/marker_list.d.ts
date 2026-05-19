import type { ReactNode } from 'react';
export interface Marker {
    svg: ReactNode;
    textY: number;
}
export declare class MarkerList {
    private readonly _minFontDistance;
    private readonly _maxMarker;
    private readonly _markers;
    constructor(fontSize: number, maxMarker: Marker);
    push(marker: Marker): void;
    getMarkers(): ReactNode[];
}
