import type { SearchMvtRequest } from '@elastic/elasticsearch/lib/api/types';
import { RENDER_AS } from './constants';
export declare function getAggsTileRequest({ buffer, risonRequestBody, geometryFieldName, gridPrecision, hasLabels, index, renderAs, x, y, z, }: {
    buffer: number;
    risonRequestBody: string;
    geometryFieldName: string;
    gridPrecision: number;
    hasLabels: boolean;
    index: string;
    renderAs: RENDER_AS;
    x: number;
    y: number;
    z: number;
}): {
    path: string;
    body: SearchMvtRequest;
};
export declare function getHitsTileRequest({ buffer, risonRequestBody, geometryFieldName, hasLabels, index, x, y, z, }: {
    buffer: number;
    risonRequestBody: string;
    geometryFieldName: string;
    hasLabels: boolean;
    index: string;
    x: number;
    y: number;
    z: number;
}): {
    path: string;
    body: SearchMvtRequest;
};
