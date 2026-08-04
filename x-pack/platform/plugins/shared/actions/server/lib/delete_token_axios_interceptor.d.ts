import type { AxiosError, AxiosResponse } from 'axios';
import type { ConnectorTokenClientContract } from '../types';
interface GetDeleteTokenAxiosInterceptorParams {
    connectorTokenClient: ConnectorTokenClientContract;
    connectorId: string;
}
export declare const getDeleteTokenAxiosInterceptor: ({ connectorTokenClient, connectorId, }: GetDeleteTokenAxiosInterceptorParams) => {
    onFulfilled: (response: AxiosResponse) => Promise<AxiosResponse<any, any, {}>>;
    onRejected: (error: AxiosError) => Promise<never>;
};
export {};
