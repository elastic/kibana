interface TransformAliasSetting {
    alias: string;
    move_on_creation?: boolean;
}
export declare const getDestinationIndexAliases: (aliasSettings: unknown) => TransformAliasSetting[];
export {};
