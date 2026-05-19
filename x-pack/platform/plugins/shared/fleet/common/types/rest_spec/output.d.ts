import type { NewOutput, Output } from '../models';
import type { ListResult } from './common';
export interface GetOneOutputResponse {
    item: Output;
}
export interface DeleteOutputResponse {
    id: string;
}
export interface GetOneOutputRequest {
    params: {
        outputId: string;
    };
}
export interface PutOutputRequest {
    params: {
        outputId: string;
    };
    body: NewOutput;
}
export interface PostOutputRequest {
    body: NewOutput;
}
export interface PutOutputResponse {
    item: Output;
}
export type GetOutputsResponse = ListResult<Output>;
export interface PostLogstashApiKeyResponse {
    api_key: string;
}
export interface GetOutputHealthResponse {
    state: string;
    message: string;
    timestamp: string;
}
