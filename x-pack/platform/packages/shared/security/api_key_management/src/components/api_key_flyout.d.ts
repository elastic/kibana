import type { ExclusiveUnion } from '@elastic/eui';
import type { FunctionComponent } from 'react';
import type { AuthenticatedUser, CoreStart } from '@kbn/core/public';
import type { CategorizedApiKey } from '@kbn/security-plugin-types-common';
import type { CreateAPIKeyParams, CreateAPIKeyResult, UpdateAPIKeyParams, UpdateAPIKeyResult } from './api_keys_api_client';
export interface ApiKeyFormValues {
    name: string;
    type: string;
    expiration: string;
    customExpiration: boolean;
    customPrivileges: boolean;
    includeMetadata: boolean;
    access: string;
    role_descriptors: string;
    metadata: string;
}
interface CommonApiKeyFlyoutProps {
    initialValues?: ApiKeyFormValues;
    onCancel(): void;
    canManageCrossClusterApiKeys?: boolean;
    readOnly?: boolean;
    http?: CoreStart['http'];
    currentUser?: AuthenticatedUser;
    isLoadingCurrentUser?: boolean;
    defaultName?: string;
    defaultMetadata?: string;
    defaultRoleDescriptors?: string;
    defaultExpiration?: string;
}
interface CreateApiKeyFlyoutProps extends CommonApiKeyFlyoutProps {
    onSuccess?: (createApiKeyResponse: CreateAPIKeyResult) => void;
}
interface UpdateApiKeyFlyoutProps extends CommonApiKeyFlyoutProps {
    onSuccess?: (updateApiKeyResponse: UpdateAPIKeyResult) => void;
    apiKey: CategorizedApiKey;
}
export type ApiKeyFlyoutProps = ExclusiveUnion<CreateApiKeyFlyoutProps, UpdateApiKeyFlyoutProps>;
export declare const ApiKeyFlyout: FunctionComponent<ApiKeyFlyoutProps>;
export declare function mapCreateApiKeyValues(values: ApiKeyFormValues): CreateAPIKeyParams;
export declare function mapUpdateApiKeyValues(type: CategorizedApiKey['type'], id: string, values: ApiKeyFormValues): UpdateAPIKeyParams;
export {};
