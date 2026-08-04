import React from 'react';
import type { NotificationsStart } from '@kbn/core/public';
import type { APIKeysAPIClient } from '@kbn/security-api-key-management';
import type { ApiKeyToInvalidate, CategorizedApiKey } from '@kbn/security-plugin-types-common';
import type { PublicMethodsOf } from '@kbn/utility-types';
interface Props {
    isAdmin: boolean;
    children: (invalidateApiKeys: InvalidateApiKeys) => React.ReactElement;
    notifications: NotificationsStart;
    apiKeysAPIClient: PublicMethodsOf<APIKeysAPIClient>;
}
export type InvalidateApiKeys = (apiKeys: CategorizedApiKey[], onSuccess?: OnSuccessCallback) => void;
type OnSuccessCallback = (apiKeysInvalidated: ApiKeyToInvalidate[]) => void;
export declare const InvalidateProvider: React.FunctionComponent<Props>;
export {};
