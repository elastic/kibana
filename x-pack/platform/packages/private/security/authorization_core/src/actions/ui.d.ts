import type { Capabilities as UICapabilities } from '@kbn/core/server';
import type { UIActions as UIActionsType } from '@kbn/security-plugin-types-server';
export declare class UIActions implements UIActionsType {
    private readonly prefix;
    constructor();
    get(featureId: keyof UICapabilities, ...uiCapabilityParts: string[]): string;
    /**
     * Checks if the action is a valid UI action.
     * @param action The action string to check.
     */
    isValid(action: string): boolean;
}
