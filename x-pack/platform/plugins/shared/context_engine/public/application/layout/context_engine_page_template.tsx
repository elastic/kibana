/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaPageTemplateProps } from '@kbn/shared-ux-page-kibana-template';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import type { ComponentProps } from 'react';
import React from 'react';
import { useContextEngineBreadcrumbs } from '../hooks/use_context_engine_breadcrumbs';
import { useKibana } from '../hooks/use_kibana';

interface ContextEnginePageTemplateProps extends Partial<KibanaPageTemplateProps> {
  breadcrumbPageName?: string;
}

export const ContextEnginePageTemplate = ({
  breadcrumbPageName,
  children,
  ...props
}: ContextEnginePageTemplateProps) => {
  const {
    services: { history, appChrome },
  } = useKibana();

  useContextEngineBreadcrumbs(breadcrumbPageName);

  return (
    <KibanaPageTemplate
      offset={0}
      restrictWidth={false}
      grow={false}
      solutionNav={appChrome?.getClassicNavigation(history)}
      {...props}
    >
      {children}
    </KibanaPageTemplate>
  );
};

export const ContextEnginePageSection = ({
  children,
  ...props
}: ComponentProps<typeof KibanaPageTemplate.Section>) => (
  <KibanaPageTemplate.Section restrictWidth paddingSize="l" {...props}>
    {children}
  </KibanaPageTemplate.Section>
);
