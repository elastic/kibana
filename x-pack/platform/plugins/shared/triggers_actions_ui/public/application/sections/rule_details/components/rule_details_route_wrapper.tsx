/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { RouteComponentProps } from 'react-router-dom';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
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
    <KibanaPageTemplate
      restrictWidth={false}
      panelled
      // @ts-expect-error Technically `paddingSize` isn't supported but it is passed through,
      // this is a stop-gap for Stack management specifically until page components can be converted to template components
      // this is required for rules detail page to have proper padding, see https://github.com/elastic/kibana/blob/main/src/platform/plugins/shared/management/public/components/management_app/management_app.tsx#L125
      mainProps={{ paddingSize: 'l' }}
    >
      <RuleDetailsRouteWithApi {...props} />
    </KibanaPageTemplate>
  );
};

// eslint-disable-next-line import/no-default-export
export default RuleDetailsRouteWrapper;
