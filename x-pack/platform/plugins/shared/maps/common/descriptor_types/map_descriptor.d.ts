import type { GeoShapeRelation } from '@elastic/elasticsearch/lib/api/types';
import type { ReactNode } from 'react';
import type { GeoJsonProperties } from 'geojson';
import type { Geometry } from 'geojson';
import type { DRAW_SHAPE } from '../constants';
import type { MapCenter } from '.';
export type MapExtent = {
    minLon: number;
    minLat: number;
    maxLon: number;
    maxLat: number;
};
export type MapCenterAndZoom = MapCenter & {
    zoom: number;
};
export type Goto = {
    bounds?: MapExtent;
    center?: MapCenterAndZoom;
};
export type TooltipFeatureAction = {
    label: string;
    id: string;
    form?: ReactNode;
    onClick?: () => void;
};
export type TooltipFeature = {
    id?: number | string;
    layerId: string;
    geometry?: Geometry;
    mbProperties: GeoJsonProperties;
    actions: TooltipFeatureAction[];
};
export type TooltipState = {
    features: TooltipFeature[];
    id: string;
    isLocked: boolean;
    location: [number, number];
};
export type DrawState = {
    actionId: string;
    drawShape?: DRAW_SHAPE;
    filterLabel?: string;
    geometryLabel?: string;
    relation?: GeoShapeRelation;
};
export type EditState = {
    layerId: string;
    drawShape?: DRAW_SHAPE;
};
