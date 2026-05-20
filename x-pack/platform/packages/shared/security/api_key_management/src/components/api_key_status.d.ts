import type { FunctionComponent } from 'react';
import type { CategorizedApiKey } from '@kbn/security-plugin-types-common';
export type ApiKeyStatusProps = Pick<CategorizedApiKey, 'expiration'>;
export declare const ApiKeyStatus: FunctionComponent<ApiKeyStatusProps>;
