import React from 'react';
export interface Props {
    mouseCoordinates?: {
        lat: number;
        lon: number;
    };
    zoom: number;
}
export declare function MouseCoordinatesControl({ mouseCoordinates, zoom }: Props): React.JSX.Element;
