import type { AxiosHeaderValue } from 'axios';
interface GetBasicAuthHeaderArgs {
    username: string;
    password: string;
}
type CombineHeadersWithBasicAuthHeader = Partial<GetBasicAuthHeaderArgs> & {
    headers?: Record<string, AxiosHeaderValue> | null;
};
export declare const getBasicAuthHeader: ({ username, password }: GetBasicAuthHeaderArgs) => {
    Authorization: string;
};
export declare const combineHeadersWithBasicAuthHeader: ({ username, password, headers, }?: CombineHeadersWithBasicAuthHeader) => Record<string, AxiosHeaderValue> | undefined;
export {};
