import React from 'react';
import { QueryClient } from '@kbn/react-query';
import type { RequestError } from '../../hooks';
export declare const queryClient: QueryClient;
export declare const DebugPage: React.FunctionComponent<{
    isInitialized: boolean;
    setupError: RequestError | null;
}>;
