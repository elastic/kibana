/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorItem } from '../../../../common/http_api/tools';

export const isDisabledEarsConnector = (
  connector: Pick<ConnectorItem, 'config' | 'isEarsExperimental'>,
  {
    isEarsEnabled,
    isEarsExperimentalEnabled,
  }: { isEarsEnabled: boolean; isEarsExperimentalEnabled: boolean }
): boolean =>
  connector.config?.authType === 'ears' &&
  (!isEarsEnabled || (Boolean(connector.isEarsExperimental) && !isEarsExperimentalEnabled));
