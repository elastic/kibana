/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';
import { css } from '@emotion/react';
import { useLocation } from 'react-router-dom';
import {
  getCasesConfigureCreateTemplatePath,
  getCasesConfigureTemplatesPath,
} from '../../common/navigation';

interface CasesPageLayoutProps {
  children: React.ReactNode;
  basePath: string;
}

export type CasesPageLayoutVariant = 'compact' | 'fullHeight';

export interface CasesPageLayoutContextValue {
  variant: CasesPageLayoutVariant;
}

const defaultLayoutContext: CasesPageLayoutContextValue = {
  variant: 'compact',
};

const CasesPageLayoutContext = createContext<CasesPageLayoutContextValue>(defaultLayoutContext);

export const useCasesPageLayout = () => useContext(CasesPageLayoutContext);

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
}: {
  pathname: string;
  basePath: string;
}): CasesPageLayoutVariant =>
  // The template editor renders edge to edge; every other Cases page uses the compact shell.
  isTemplateEditorPath(pathname, basePath) ? 'fullHeight' : 'compact';

export const CasesPageLayout = ({ children, basePath }: CasesPageLayoutProps) => {
  const { pathname } = useLocation();
  const variant = getCasesPageLayoutVariant({
    pathname,
    basePath,
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
