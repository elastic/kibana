/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, lazy } from 'react';
import { CenterJustifiedSpinner } from '../../../components/center_justified_spinner';

const RuleDetailsPage = lazy(() => import('../rule_details_page'));

/**
 * Route wrapper for composable rule details page.
 * Uses widget getters from triggers_actions_ui to compose the page layout
 * and renders AlertsTable directly with custom alert actions.
 */
const RuleDetailsRouteWrapper: React.FunctionComponent = () => {
  return (
    <Suspense fallback={<CenterJustifiedSpinner />}>
      <RuleDetailsPage />
    </Suspense>
  );
};

// eslint-disable-next-line import/no-default-export
export default RuleDetailsRouteWrapper;
