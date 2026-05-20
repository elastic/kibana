import type { PackagePolicy } from '../../../types';
import type { AzureArmTemplateProps } from '../../agent_enrollment_flyout/types';
/**
 * Get the Azure Arm Template url from a package policy
 * It looks for a config with an arm_template_url object present in the enabled inputs of the package policy
 */
export declare const getAzureArmPropsFromPackagePolicy: (packagePolicy?: PackagePolicy) => AzureArmTemplateProps;
