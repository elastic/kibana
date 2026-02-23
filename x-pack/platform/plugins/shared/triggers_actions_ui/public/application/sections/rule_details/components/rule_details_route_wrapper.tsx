/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { RouteComponentProps } from 'react-router-dom';
import { RulesPageTemplate } from '../../rules_page/rules_page_template';
import RuleDetailsRouteWithApi from './rule_details_route';

type RuleDetailsRouteWrapperProps = RouteComponentProps<{
  ruleId: string;
}>;

/**
 * Wrapper component for RuleDetailsRoute that provides KibanaPageTemplate layout.
 * This matches the layout structure provided by the management plugin wrapper.
 * Only used in the standalone rules page app (/app/rules), not in management plugin routes.
 */
const RuleDetailsRouteWrapper: React.FunctionComponent<RuleDetailsRouteWrapperProps> = (props) => {
  return (
    <RulesPageTemplate>
      <RuleDetailsRouteWithApi {...props} />
    </RulesPageTemplate>
  );
};

// eslint-disable-next-line import/no-default-export
export default RuleDetailsRouteWrapper;
