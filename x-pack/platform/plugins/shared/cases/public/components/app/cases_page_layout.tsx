/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { useLocation } from 'react-router-dom';
import { KibanaServices } from '../../common/lib/kibana';
import {
  getCasesConfigureCreateTemplatePath,
  getCasesConfigureTemplatesPath,
} from '../../common/navigation';

interface CasesPageLayoutProps {
  children: React.ReactNode;
  basePath: string;
}

interface CasesRedesignConfig {
  list: boolean;
  details: boolean;
  settings: boolean;
}

export type CasesPageLayoutVariant = 'legacy' | 'compact' | 'fullHeight';

export interface CasesPageLayoutContextValue {
  variant: CasesPageLayoutVariant;
}

const defaultLayoutContext: CasesPageLayoutContextValue = {
  variant: 'legacy',
};

const CasesPageLayoutContext = createContext<CasesPageLayoutContextValue>(defaultLayoutContext);

export const useCasesPageLayout = () => useContext(CasesPageLayoutContext);

const normalizeBasePath = (basePath: string): string => {
  if (basePath === '/') {
    return '/';
  }

  return basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
};

const appendToBasePath = (basePath: string, path: string): string =>
  basePath === '/' ? path : `${basePath}${path}`;

const isPathWithin = (pathname: string, path: string): boolean =>
  pathname === path || (path === '/' ? pathname.startsWith('/') : pathname.startsWith(`${path}/`));

const isTemplateEditorPath = (pathname: string, basePath: string): boolean => {
  const createTemplatePath = getCasesConfigureCreateTemplatePath(basePath);

  if (isPathWithin(pathname, createTemplatePath)) {
    return true;
  }

  const templatesPath = getCasesConfigureTemplatesPath(basePath);

  return pathname.startsWith(`${templatesPath}/`) && pathname.endsWith('/edit');
};

export const getCasesPageLayoutVariant = ({
  pathname,
  basePath,
  casesRedesign,
}: {
  pathname: string;
  basePath: string;
  casesRedesign: CasesRedesignConfig;
}): CasesPageLayoutVariant => {
  const normalizedBasePath = normalizeBasePath(basePath);

  if (isPathWithin(pathname, appendToBasePath(normalizedBasePath, '/configure'))) {
    if (casesRedesign.settings && isTemplateEditorPath(pathname, basePath)) {
      return 'fullHeight';
    }

    return casesRedesign.settings ? 'compact' : 'legacy';
  }

  if (
    isPathWithin(pathname, appendToBasePath(normalizedBasePath, '/create')) ||
    pathname === normalizedBasePath
  ) {
    return casesRedesign.list ? 'compact' : 'legacy';
  }

  if (isPathWithin(pathname, normalizedBasePath)) {
    return casesRedesign.details ? 'compact' : 'legacy';
  }

  return 'legacy';
};

export const CasesPageLayout = ({ children, basePath }: CasesPageLayoutProps) => {
  const { pathname } = useLocation();
  const { euiTheme } = useEuiTheme();
  const config = KibanaServices.getConfig();
  const casesRedesign = {
    list: config?.casesRedesign?.list ?? false,
    details: config?.casesRedesign?.details ?? false,
    settings: config?.casesRedesign?.settings ?? false,
  };
  const variant = getCasesPageLayoutVariant({
    pathname,
    basePath,
    casesRedesign,
  });

  return (
    <CasesPageLayoutContext.Provider value={{ variant }}>
      <div
        data-test-subj="casesPageLayout"
        data-layout-variant={variant}
        css={css({
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          ...(variant === 'legacy' && {
            padding: euiTheme.size.l,
          }),
          ...(variant === 'fullHeight' && {
            flex: 1,
            minHeight: 0,
          }),
        })}
      >
        {children}
      </div>
    </CasesPageLayoutContext.Provider>
  );
};

CasesPageLayout.displayName = 'CasesPageLayout';
