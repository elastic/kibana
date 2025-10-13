/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { attemptToURIDecode } from '../../shared_imports';

export const normalizePipelineNameFromParams = (nameFromRouterParams: string) => {
  if (window.location.pathname.endsWith(nameFromRouterParams)) {
    return attemptToURIDecode(nameFromRouterParams);
  }

  // this is a temporary workaround because history v4
  // decodes pathname special characters incorrectly
  // see https://github.com/elastic/kibana/issues/234500
  return attemptToURIDecode(window.location.pathname.split('/').pop());
};
