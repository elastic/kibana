/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { useEffect } from 'react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import { useServices } from '../services';
import { i18nTexts } from '../translations';

export interface Crumb {
  readonly text: string;
  readonly path?: string;
}

interface PageLayoutProps {
  readonly title: ReactNode;
  readonly documentTitle: string;
  readonly breadcrumbs: readonly Crumb[];
  readonly description?: ReactNode;
  readonly rightSideItems?: ReactNode[];
  readonly children: ReactNode;
}

/** Page chrome shared by all Index Explorer pages: header, breadcrumbs and document title. */
export function PageLayout({
  title,
  documentTitle,
  breadcrumbs,
  description,
  rightSideItems,
  children,
}: PageLayoutProps) {
  const { core, history } = useServices();
  const { chrome } = core;
  const breadcrumbKey = JSON.stringify(breadcrumbs);

  useEffect(() => {
    const pageCrumbs: Crumb[] = JSON.parse(breadcrumbKey);
    const crumbs: Crumb[] = [{ text: i18nTexts.appTitle, path: '/' }, ...pageCrumbs];
    chrome.setBreadcrumbs(
      crumbs.map(({ text, path }, position) =>
        path && position < crumbs.length - 1
          ? { text, ...reactRouterNavigate(history, path) }
          : { text }
      )
    );
    chrome.docTitle.change([documentTitle, i18nTexts.appTitle]);
  }, [chrome, history, breadcrumbKey, documentTitle]);

  return (
    <KibanaPageTemplate>
      <KibanaPageTemplate.Header
        pageTitle={title}
        description={description}
        rightSideItems={rightSideItems}
      />
      <KibanaPageTemplate.Section>{children}</KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
}
