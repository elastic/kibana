import type { CustomIntegration } from '@kbn/custom-integrations-plugin/common';
import type { PackageListItem } from '../../../../common/types/models';
export declare function useMergeEprPackagesWithReplacements(rawEprPackages: PackageListItem[], replacements: CustomIntegration[]): Array<PackageListItem | CustomIntegration>;
