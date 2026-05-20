import type { CloudFormationProps } from '../../agent_enrollment_flyout/types';
import type { PackagePolicy } from '../../../types';
/**
 * Get the cloud formation template url from a package policy
 * It looks for a config with a cloud_formation_template_url object present in
 * the enabled inputs of the package policy
 */
export declare const getCloudFormationPropsFromPackagePolicy: (packagePolicy?: PackagePolicy) => CloudFormationProps;
