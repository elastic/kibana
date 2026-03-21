export declare class KibanaPrivilege {
    readonly id: string;
    readonly actions: string[];
    constructor(id: string, actions?: string[]);
    get name(): string;
    grantsPrivilege(candidatePrivilege: KibanaPrivilege): boolean;
    private checkActions;
}
