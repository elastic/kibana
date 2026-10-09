/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { RouteComponentProps } from 'react-router-dom';
import RuleDetailsRouteWithApi from './rule_details_route';

type RuleDetailsRouteWrapperProps = RouteComponentProps<{
  ruleId: string;
}>;

const RuleDetailsRouteWrapper: React.FunctionComponent<RuleDetailsRouteWrapperProps> = (props) => {
  return <RuleDetailsRouteWithApi {...props} />;
};

// eslint-disable-next-line import/no-default-export
export default RuleDetailsRouteWrapper;
