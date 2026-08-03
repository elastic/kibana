import type { GeoShapeRelation } from '@elastic/elasticsearch/lib/api/types';
export declare function getDataSourceLabel(): string;
export declare function getUrlLabel(): string;
export declare function getEsSpatialRelationLabel(spatialRelation: GeoShapeRelation): string;
export declare function getDataViewLabel(): string;
export declare function getDataViewSelectPlaceholder(): string;
export declare function getDataViewNotFoundMessage(id: string): string;
