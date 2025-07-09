/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import classNames from 'classnames';

import { KibanaPageTemplate, KibanaPageTemplateProps } from '@kbn/shared-ux-page-kibana-template';

import './page_template.scss';
import { ChromeBreadcrumb } from '@kbn/core/public';
import { Loading } from './loading';
import { FlashMessages } from './flash_messages';

export type PageTemplateProps = KibanaPageTemplateProps & {
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
  children,
  className,
  customPageSections,
  hideFlashMessages,
  isLoading,
  isEmptyState,
  emptyState,
  setPageChrome,
  ...pageTemplateProps
}) => {
  const hasCustomEmptyState = !!emptyState;
  const showCustomEmptyState = hasCustomEmptyState && isEmptyState;

  return (
    <KibanaPageTemplate
      {...pageTemplateProps}
      className={classNames('searchConnectorsPageTemplate', className)}
      mainProps={{
        ...pageTemplateProps.mainProps,
        className: classNames(
          'searchConnectorsPageTemplate__content',
          pageTemplateProps.mainProps?.className
        ),
      }}
      isEmptyState={isEmptyState && !isLoading}
    >
      {setPageChrome}
      {!hideFlashMessages && <FlashMessages />}
      {isLoading ? (
        <Loading />
      ) : showCustomEmptyState ? (
        emptyState
      ) : customPageSections ? (
        children
      ) : (
        <KibanaPageTemplate.Section>{children}</KibanaPageTemplate.Section>
      )}
    </KibanaPageTemplate>
  );
};
