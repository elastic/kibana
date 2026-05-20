import type { Logger, SecurityServiceStart } from '@kbn/core/server';
import type { ApiKeyType } from '../config';
import type { ApiKeyStrategy } from './api_key_strategy';
export declare const createApiKeyStrategy: (apiKeyType: ApiKeyType, grantUiamApiKeys: boolean, security: SecurityServiceStart, logger: Logger) => ApiKeyStrategy;
