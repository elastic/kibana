export interface RawKibanaFeaturePrivileges {
    [featureId: string]: {
        [privilegeId: string]: string[];
    };
}
export interface RawKibanaPrivileges {
    global: Record<string, string[]>;
    features: RawKibanaFeaturePrivileges;
    space: Record<string, string[]>;
    reserved: Record<string, string[]>;
}
