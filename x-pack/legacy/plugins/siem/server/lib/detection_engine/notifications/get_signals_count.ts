/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { NotificationExecutorOptions } from './types';
import { buildSignalsSearchQuery } from './build_signals_query';

interface GetSignalsCount {
  from: string;
  to: string;
  ruleId: string;
  index: string;
  callCluster: NotificationExecutorOptions['services']['callCluster'];
}

export const getSignalsCount = async ({
  from,
  to,
  ruleId,
  index,
  callCluster,
}: GetSignalsCount): Promise<string> => {
  const query = buildSignalsSearchQuery({
    index,
    ruleId,
    to,
    from,
  });

  const result = await callCluster('count', query);

  return result.count;
};
