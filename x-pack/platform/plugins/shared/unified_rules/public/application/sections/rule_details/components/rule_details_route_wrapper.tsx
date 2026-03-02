/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, lazy } from 'react';
import type { RouteComponentProps } from 'react-router-dom';
import { RulesPageTemplate } from '../../rules_page/rules_page_template';
import { CenterJustifiedSpinner } from '../../../components/center_justified_spinner';

// Shallow copy: RuleDetailsRouteWithApi lives in triggers_actions_ui until the full
// transitive component tree is moved to unified_rules in a follow-up PR.
const RuleDetailsRouteWithApi = lazy(() =>
  import('@kbn/triggers-actions-ui-plugin/public').then((m) => ({
    default: m.RuleDetailsRouteWithApi,
  }))
);

type RuleDetailsRouteWrapperProps = RouteComponentProps<{
  ruleId: string;
}>;

/**
 * Wrapper component for RuleDetailsRoute that provides KibanaPageTemplate layout.
 * Only used in the standalone rules page app (/app/rules), not in management plugin routes.
 */
const RuleDetailsRouteWrapper: React.FunctionComponent<RuleDetailsRouteWrapperProps> = (props) => {
  return (
    <RulesPageTemplate>
      <Suspense fallback={<CenterJustifiedSpinner />}>
        <RuleDetailsRouteWithApi {...props} />
      </Suspense>
    </RulesPageTemplate>
  );
};

// eslint-disable-next-line import/no-default-export
export default RuleDetailsRouteWrapper;
