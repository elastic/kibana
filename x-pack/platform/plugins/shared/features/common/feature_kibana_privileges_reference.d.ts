/**
 * Defines a reference to a set of privileges of a specific feature.
 */
export interface FeatureKibanaPrivilegesReference {
    /**
     * The ID of the feature.
     */
    feature: string;
    /**
     * The set of IDs of feature or sub-feature privileges provided by the feature.
     */
    privileges: readonly string[];
}
