/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup, NavigateToUrlOptions, ScopedHistory } from '@kbn/core/public';

export interface ReactRouterProps {
  to: string;
  onClick?(): void;
  // Used to navigate outside of the React Router plugin basename but still within Kibana,
  // e.g. if we need to go from Enterprise Search to App Search
  shouldNotCreateHref?: boolean;
  // Used if to is already a fully qualified URL that doesn't need basePath prepended
  shouldNotPrepend?: boolean;
  http?: HttpSetup;
  navigateToUrl?: (url: string, options?: NavigateToUrlOptions) => Promise<void>;
  history: ScopedHistory;
}
