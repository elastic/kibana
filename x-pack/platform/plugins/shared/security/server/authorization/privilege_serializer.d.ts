interface FeaturePrivilege {
    featureId: string;
    privilege: string;
}
export declare class PrivilegeSerializer {
    static isSerializedGlobalBasePrivilege(privilegeName: string): boolean;
    static isSerializedSpaceBasePrivilege(privilegeName: string): boolean;
    static isSerializedReservedPrivilege(privilegeName: string): boolean;
    static isSerializedFeaturePrivilege(privilegeName: string): boolean;
    static serializeGlobalBasePrivilege(privilegeName: string): string;
    static serializeSpaceBasePrivilege(privilegeName: string): string;
    static serializeFeaturePrivilege(featureId: string, privilegeName: string): string;
    static serializeReservedPrivilege(privilegeName: string): string;
    static deserializeFeaturePrivilege(privilege: string): FeaturePrivilege;
    static deserializeGlobalBasePrivilege(privilege: string): string;
    static deserializeSpaceBasePrivilege(privilege: string): string;
    static deserializeReservedPrivilege(privilege: string): string;
}
export {};
