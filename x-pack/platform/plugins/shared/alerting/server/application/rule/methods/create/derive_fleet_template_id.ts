/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Best-effort fallback for deriving a rule template id from a Fleet-generated rule id
 * when the caller did not pass `templateId` explicitly. Fleet always knows the template id
 * and should pass it directly (see `createAlertingRuleFromTemplate` in the Fleet plugin);
 * this is only a safety net for callers that don't.
 *
 * Fleet rule ids follow the pattern `fleet-${spaceId}-${pkgName}-${templateId}`. Package
 * names are not expected to contain hyphens, so after stripping the `fleet-${spaceId}-`
 * prefix, everything up to the first remaining `-` is treated as the package name and
 * everything after it as the template id. This is ambiguous if a package name ever
 * contains a hyphen, in which case the derived template id would be wrong.
 */
export function deriveFleetTemplateId(
  ruleId: string | undefined,
  spaceId: string
): string | undefined {
  if (!ruleId) {
    return undefined;
  }
  const prefix = `fleet-${spaceId}-`;
  if (!ruleId.startsWith(prefix)) {
    return undefined;
  }
  const remainder = ruleId.slice(prefix.length);
  const separatorIndex = remainder.indexOf('-');
  if (separatorIndex === -1 || separatorIndex === remainder.length - 1) {
    return undefined;
  }
  return remainder.slice(separatorIndex + 1);
}
