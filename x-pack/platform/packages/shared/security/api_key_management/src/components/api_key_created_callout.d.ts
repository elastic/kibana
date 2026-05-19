import type { FunctionComponent } from 'react';
import type { CreateAPIKeyResult } from './api_keys_api_client';
export interface ApiKeyCreatedCalloutProps {
    createdApiKey: CreateAPIKeyResult;
}
export declare const ApiKeyCreatedCallout: FunctionComponent<ApiKeyCreatedCalloutProps>;
export declare const ApiKeySelectableTokenField: FunctionComponent<ApiKeyCreatedCalloutProps>;
