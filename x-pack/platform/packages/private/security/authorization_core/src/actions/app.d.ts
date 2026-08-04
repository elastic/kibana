import type { AppActions as AppActionsType } from '@kbn/security-plugin-types-server';
export declare class AppActions implements AppActionsType {
    private readonly prefix;
    constructor();
    get(appId: string): string;
}
