/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildTagSuggestionsQuery } from '@kbn/alerting-v2-common-queries';

export { TAG_SUGGESTIONS_LIMIT } from '@kbn/alerting-v2-common-queries';

export const buildAlertActionTagSuggestionsQuery = (spaceId: string): string =>
  buildTagSuggestionsQuery(spaceId);
