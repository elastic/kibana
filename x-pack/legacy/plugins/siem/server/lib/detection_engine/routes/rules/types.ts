/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestFacade } from '../../../../types';

export type QueryRequest = Omit<RequestFacade, 'query'> & {
  query: { id: string | undefined; rule_id: string | undefined };
};
