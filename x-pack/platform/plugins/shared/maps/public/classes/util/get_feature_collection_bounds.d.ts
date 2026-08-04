import type { FeatureCollection } from 'geojson';
import type { MapExtent } from '../../../common/descriptor_types';
export declare function getFeatureCollectionBounds(featureCollection: FeatureCollection | null, hasJoins: boolean): MapExtent | null;
