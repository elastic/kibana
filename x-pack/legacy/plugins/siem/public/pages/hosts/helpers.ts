/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { escapeQueryValue } from '../../lib/keury';

/** Returns the kqlQueryExpression for the `Events` widget on the `Host Details` page */
export const getHostDetailsEventsKqlQueryExpression = ({
  filterQueryExpression,
  hostName,
}: {
  filterQueryExpression: string;
  hostName: string;
}): string => {
  if (filterQueryExpression.length) {
    return `${filterQueryExpression}${
      hostName.length ? ` and host.name: ${escapeQueryValue(hostName)}` : ''
    }`;
  } else {
    return hostName.length ? `host.name: ${escapeQueryValue(hostName)}` : '';
  }
};
