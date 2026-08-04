import type { CasesActions as CasesActionsType } from '@kbn/security-plugin-types-server';
export declare class CasesActions implements CasesActionsType {
    private readonly prefix;
    constructor();
    get(owner: string, operation: string): string;
}
