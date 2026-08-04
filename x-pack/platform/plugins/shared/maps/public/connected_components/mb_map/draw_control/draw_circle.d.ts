import type { Feature, GeoJSON, Position } from 'geojson';
export declare const DRAW_CIRCLE_RADIUS_LABEL_STYLE: {
    id: string;
    type: string;
    filter: string[];
    layout: {
        'text-anchor': string;
        'text-field': string;
        'text-size': number;
        'text-offset': number[];
        'text-ignore-placement': boolean;
        'text-allow-overlap': boolean;
    };
    paint: {
        'text-color': string;
        'text-halo-color': string;
        'text-halo-width': number;
    };
};
export interface DrawCircleProperties {
    center: Position;
    radiusKm: number;
}
type DrawCircleState = {
    circle: {
        properties: Omit<DrawCircleProperties, 'center'> & {
            center: Position | null;
            edge: Position | null;
            radiusKm: number;
        };
        id: string | number;
        incomingCoords: (coords: unknown[]) => void;
        toGeoJSON: () => GeoJSON;
    };
};
type MouseEvent = {
    lngLat: {
        lng: number;
        lat: number;
    };
};
export declare const DrawCircle: {
    onSetup(): {
        circle: unknown;
    };
    onKeyUp(state: DrawCircleState, e: {
        keyCode: number;
    }): void;
    onClick(state: DrawCircleState, e: MouseEvent): void;
    onMouseMove(state: DrawCircleState, e: MouseEvent): void;
    onStop(state: DrawCircleState): void;
    toDisplayFeatures(state: DrawCircleState, geojson: Feature, display: (geojson: Feature) => void): null | undefined;
    onTrash(state: DrawCircleState): void;
};
export {};
