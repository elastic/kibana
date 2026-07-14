interface GenericObject {
    [key: string]: unknown;
}
export declare const unflattenObject: <T extends object = GenericObject>(object: object) => T;
export {};
