import type { ReactNode } from 'react';
import type { DataRequestDescriptor, DataRequestMeta } from '../../../common/descriptor_types';
export declare class DataRequest {
    private readonly _descriptor;
    constructor(descriptor: DataRequestDescriptor);
    getData(): object | undefined;
    isLoading(): boolean;
    getMeta(): DataRequestMeta;
    hasData(): boolean;
    hasDataOrRequestInProgress(): boolean;
    getDataId(): string;
    getRequestToken(): symbol | undefined;
    getError(): Error | undefined;
    renderError(): ReactNode;
}
export declare class DataRequestAbortError extends Error {
    constructor();
}
