import type { SpaceActions as SpaceActionsType } from '@kbn/security-plugin-types-server';
export declare class SpaceActions implements SpaceActionsType {
    private readonly prefix;
    constructor();
    get manage(): string;
}
