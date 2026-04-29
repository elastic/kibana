/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiServicesFixture } from '@kbn/scout';

export async function getRuleIdByName(
  apiServices: ApiServicesFixture,
  ruleName: string
): Promise<string | undefined> {
  const rules = await apiServices.alerting.rules.find({ search: ruleName });
  const rule = rules?.data?.data?.find((r: { name: string }) => r.name === ruleName);
  return rule?.id;
}

export async function deleteRuleByName(
  apiServices: ApiServicesFixture,
  ruleName: string
): Promise<void> {
  const rules = await apiServices.alerting.rules.find({ search: ruleName });
  const match = rules?.data?.data?.find((r: { name: string }) => r.name === ruleName);
  if (match) {
    await apiServices.alerting.rules.delete(match.id).catch(() => {});
  }
}
