import React from 'react';
interface CollectorContextValue {
    serviceInstanceId?: string;
}
export declare const CollectorContextProvider: React.FC<{
    serviceInstanceId?: string;
    children: React.ReactNode;
}>;
export declare const useCollectorContext: () => CollectorContextValue;
export {};
