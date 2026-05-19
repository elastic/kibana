import type { AuthMode } from '@kbn/connector-specs';
import type { AuthTypeRegistry } from '../auth_types/auth_type_registry';
interface InferAuthModeParams {
    authTypeRegistry: AuthTypeRegistry;
    secrets?: Record<string, unknown>;
    config?: Record<string, unknown>;
}
export declare function inferAuthMode({ authTypeRegistry, secrets, config, }: InferAuthModeParams): AuthMode | undefined;
export {};
