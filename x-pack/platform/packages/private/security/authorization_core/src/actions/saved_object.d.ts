import type { SavedObjectActions as SavedObjectActionsType } from '@kbn/security-plugin-types-server';
export declare class SavedObjectActions implements SavedObjectActionsType {
    private readonly prefix;
    constructor();
    get(type: string, operation: string): string;
}
