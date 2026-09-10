/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiSpacer } from '@elastic/eui';
import type { KibanaPageTemplateProps } from '@kbn/shared-ux-page-kibana-template';

import type { ChromeBreadcrumb } from '@kbn/core/public';
import { Loading } from './loading';
import { FlashMessages } from './flash_messages';
import * as Styles from './styles';

export type PageTemplateProps = KibanaPageTemplateProps & {
  appHeader?: React.ReactNode;
  customPageSections?: boolean; // If false, automatically wraps children in an EuiPageSection
  emptyState?: React.ReactNode;
  hideFlashMessages?: boolean;
  isLoading?: boolean;
  // Used by product-specific page templates
  pageChrome?: ChromeBreadcrumb[];
  pageViewTelemetry?: string;
  setPageChrome?: React.ReactNode;
};

export const SearchConnectorsPageTemplateWrapper: React.FC<PageTemplateProps> = ({
  appHeader,
  children,
  customPageSections,
  hideFlashMessages,
  isLoading,
  isEmptyState,
  emptyState,
  setPageChrome,
}) => {
  const hasCustomEmptyState = !!emptyState;
  const showCustomEmptyState = hasCustomEmptyState && isEmptyState;

  const body = isLoading ? (
    <Loading />
  ) : showCustomEmptyState ? (
    emptyState
  ) : customPageSections ? (
    children
  ) : (
    <>
      {appHeader}
      {appHeader && <EuiSpacer size="l" />}
      {!hideFlashMessages && <FlashMessages />}
      {children}
    </>
  );

  return (
    <div className={Styles.searchConnectorsPageTemplate}>
      {setPageChrome}
      {body}
    </div>
  );
};
