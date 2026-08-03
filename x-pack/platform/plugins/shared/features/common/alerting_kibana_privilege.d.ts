/**
 * Interface for registering an alerting privilege.
 * Alerting privilege registration allows plugins to
 * specify for which rule types and consumers the feature
 * has access to.
 */
export type AlertingKibanaPrivilege = ReadonlyArray<{
    ruleTypeId: string;
    consumers: readonly string[];
}>;
