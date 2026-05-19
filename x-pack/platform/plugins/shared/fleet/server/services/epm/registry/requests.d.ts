import type { RequestInit, Response } from 'node-fetch';
export declare function getResponse(url: string, retries?: number): Promise<Response | null>;
export declare function getResponseStream(url: string, retries?: number): Promise<NodeJS.ReadableStream>;
export declare function getResponseStreamWithSize(url: string, retries?: number): Promise<{
    stream: NodeJS.ReadableStream;
    size?: number;
}>;
export declare function fetchUrl(url: string, retries?: number): Promise<string>;
export declare function getFetchOptions(targetUrl: string): RequestInit | undefined;
