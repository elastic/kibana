import type { MapCenterAndZoom } from '../../common/descriptor_types';
interface MapPanel {
    getTitle(): string;
    onLocationChange(lat: number, lon: number, zoom: number): void;
    getIsMovementSynchronized(): boolean;
    setIsMovementSynchronized(IsMovementSynchronized: boolean): void;
    getIsFilterByMapExtent(): boolean;
    setIsFilterByMapExtent(isFilterByMapExtent: boolean): void;
    getGeoFieldNames(): string[];
}
export declare const mapEmbeddablesSingleton: {
    getGeoFieldNames(): string[];
    getLocation(): MapCenterAndZoom | undefined;
    getMapPanels(): {
        id: string;
        getTitle(): string;
        onLocationChange(lat: number, lon: number, zoom: number): void;
        getIsMovementSynchronized(): boolean;
        setIsMovementSynchronized(IsMovementSynchronized: boolean): void;
        getIsFilterByMapExtent(): boolean;
        setIsFilterByMapExtent(isFilterByMapExtent: boolean): void;
        getGeoFieldNames(): string[];
    }[];
    hasMultipleMaps(): boolean;
    register(embeddableId: string, mapPanel: MapPanel): void;
    setLocation(triggeringEmbeddableId: string, lat: number, lon: number, zoom: number): void;
    unregister(embeddableId: string): void;
};
export {};
