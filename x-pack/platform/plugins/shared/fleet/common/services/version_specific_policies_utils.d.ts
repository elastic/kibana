export declare function hasVersionSuffix(policyId: string): boolean;
export declare function splitVersionSuffixFromPolicyId(policyId: string): {
    baseId: string;
    version: string | null;
};
export declare function removeVersionSuffixFromPolicyId(policyId: string): string;
