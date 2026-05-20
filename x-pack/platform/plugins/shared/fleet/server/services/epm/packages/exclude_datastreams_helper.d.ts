import type { RegistryPolicyTemplate } from '../../../../common';
import type { Installable, RegistrySearchResult } from '../../../types';
export declare function shouldIncludePackageWithDatastreamTypes(pkg: Installable<any>, excludeDataStreamTypes?: string[]): any;
export declare function shouldIncludePolicyTemplateWithDatastreamTypes(pkg: Installable<any>, policyTemplate: RegistryPolicyTemplate, excludeDataStreamTypes?: string[]): boolean;
/**
 * Filter data_streams and policy templates to respect excluded DataStreamTypes
 */
export declare function filterOutExcludedDataStreamTypes<T extends RegistrySearchResult>(packageList: Array<Installable<T>>, excludeDataStreamTypes?: string[]): Array<Installable<T>>;
