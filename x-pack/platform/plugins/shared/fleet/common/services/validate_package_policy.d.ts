import type { NewPackagePolicy, PackagePolicyInput, PackagePolicyInputStream, PackagePolicyConfigRecordEntry, PackageInfo, RegistryVarsEntry } from '../types';
type Errors = string[] | null;
interface DurationParseResult {
    isValid: boolean;
    valueNs: number;
    errors: string[];
}
/**
 * Parses a duration string into nanoseconds and validates the format.
 * Valid time units are "ms", "s", "m", "h".
 *
 * @param durationStr - The duration string to parse (e.g., "1h30m45s")
 * @returns An object with parsing results
 */
export declare const parseDuration: (durationStr: string) => DurationParseResult;
type ValidationEntry = Record<string, Errors>;
interface ValidationRequiredVarsEntry {
    name: string;
    invalid: boolean;
}
type ValidationRequiredVars = Record<string, ValidationRequiredVarsEntry[]>;
export interface PackagePolicyConfigValidationResults {
    required_vars?: ValidationRequiredVars | null;
    vars?: ValidationEntry;
}
export type PackagePolicyInputValidationResults = PackagePolicyConfigValidationResults & {
    streams?: Record<PackagePolicyInputStream['id'], PackagePolicyConfigValidationResults>;
};
export type PackagePolicyValidationResults = {
    name: Errors;
    description: Errors;
    namespace: Errors;
    additional_datastreams_permissions: Errors;
    inputs: Record<PackagePolicyInput['type'], PackagePolicyInputValidationResults> | null;
} & PackagePolicyConfigValidationResults;
export declare const validatePackagePolicy: (packagePolicy: NewPackagePolicy, packageInfo: PackageInfo, safeLoadYaml: (yaml: string) => any, spaceSettings?: {
    allowedNamespacePrefixes?: string[];
}) => PackagePolicyValidationResults;
export declare const validatePackagePolicyConfig: (configEntry: PackagePolicyConfigRecordEntry | undefined, varDef: RegistryVarsEntry, varName: string, safeLoadYaml: (yaml: string) => any, packageType?: string, isRequiredByVarGroup?: boolean) => string[] | null;
export declare const countValidationErrors: (validationResults: PackagePolicyValidationResults | PackagePolicyInputValidationResults | PackagePolicyConfigValidationResults) => number;
export declare const validationHasErrors: (validationResults: PackagePolicyValidationResults | PackagePolicyInputValidationResults | PackagePolicyConfigValidationResults) => boolean;
export {};
