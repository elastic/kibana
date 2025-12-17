/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertingConfig } from '../config';
import type { AlertingPluginsStart } from '../plugin';
import { spaceIdToNamespace } from '../lib';

export function getEsqlRulesAlertsDataStreamName({
  config,
  spaceId,
  spaces,
}: {
  config: AlertingConfig;
  spaceId: string;
  spaces?: AlertingPluginsStart['spaces'];
}) {
  const namespace = spaceIdToNamespace(spaces, spaceId) ?? 'default';
  return `${config.esqlRules.alertsDataStreamPrefix}-${namespace}`;
}
