/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import type { KibanaPageTemplateProps } from '@kbn/shared-ux-page-kibana-template';

type RulesPageTemplateProps = Omit<
  KibanaPageTemplateProps,
  'restrictWidth' | 'panelled' | 'mainProps'
> & {
  children: React.ReactNode;
  pageHeader?: KibanaPageTemplateProps['pageHeader'];
};

/**
 * Shared template wrapper for rules page app routes.
 * Provides consistent layout configuration matching the management plugin wrapper.
 * This ensures all routes in the standalone rules page app (/app/rules) have the same base layout.
 */
export const RulesPageTemplate: React.FunctionComponent<RulesPageTemplateProps> = ({
  children,
  pageHeader,
  ...restProps
}) => {
  return (
    <KibanaPageTemplate
      restrictWidth={false}
      panelled
      // @ts-expect-error Technically `paddingSize` isn't supported but it is passed through,
      // this is a stop-gap for Stack management specifically until page components can be converted to template components
      // this is required for rules detail page to have proper padding, see https://github.com/elastic/kibana/blob/main/src/platform/plugins/shared/management/public/components/management_app/management_app.tsx#L125
      mainProps={{ paddingSize: 'l' }}
      pageHeader={pageHeader}
      {...restProps}
    >
      {children}
    </KibanaPageTemplate>
  );
};
