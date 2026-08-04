interface DataVizError extends Error {
    handled?: boolean;
}
export type HandleErrorCallback = (e: DataVizError, title?: string) => void;
export declare const handleError: ({ onError, request, error, title, }: {
    error: DataVizError;
    request: object;
    onError?: HandleErrorCallback;
    title?: string;
}) => void;
export {};
