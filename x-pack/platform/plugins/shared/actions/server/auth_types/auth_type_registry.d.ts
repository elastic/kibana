import type { NormalizedAuthType } from '@kbn/connector-specs';
export declare class AuthTypeRegistry {
    private readonly authTypes;
    constructor();
    /**
     * Returns if the auth type registry has the given action type registered
     */
    has(id: string): boolean;
    /**
     * Registers an auth type
     */
    register(authType: NormalizedAuthType): void;
    /**
     * Returns an auth type, throws if not registered
     */
    get(id: string): NormalizedAuthType;
    getAllTypes(): string[];
}
