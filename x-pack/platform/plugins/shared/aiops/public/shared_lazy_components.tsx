/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React, { Suspense } from 'react';

import { EuiErrorBoundary, EuiSkeletonText } from '@elastic/eui';
import type { LogRateAnalysisAppStateProps } from './components/log_rate_analysis';
import type { LogRateAnalysisContentWrapperProps } from './components/log_rate_analysis/log_rate_analysis_content/log_rate_analysis_content_wrapper';
import type { LogCategorizationAppStateProps } from './components/log_categorization';
import type { LogCategorizationEmbeddableWrapperProps } from './components/log_categorization/log_categorization_for_embeddable/log_categorization_for_discover_wrapper';
import type { ChangePointDetectionAppStateProps } from './components/change_point_detection';

const LogRateAnalysisAppStateLazy = React.lazy(() => import('./components/log_rate_analysis'));

const LogRateAnalysisContentWrapperLazy = React.lazy(
  () => import('./components/log_rate_analysis/log_rate_analysis_content')
);

const LazyWrapper: FC<PropsWithChildren<unknown>> = ({ children }) => (
  <EuiErrorBoundary>
    <Suspense fallback={<EuiSkeletonText lines={3} />}>{children}</Suspense>
  </EuiErrorBoundary>
);

/**
 * Lazy-wrapped LogRateAnalysisAppState React component
 * @param {LogRateAnalysisAppStateProps}  props - properties specifying the data on which to run the analysis.
 */
export const LogRateAnalysis: FC<LogRateAnalysisAppStateProps> = (props) => (
  <LazyWrapper>
    <LogRateAnalysisAppStateLazy {...props} />
  </LazyWrapper>
);

/**
 * Lazy-wrapped LogRateAnalysisContentWrapperReact component
 * @param {LogRateAnalysisContentWrapperProps}  props - properties specifying the data on which to run the analysis.
 */
export const LogRateAnalysisContent: FC<LogRateAnalysisContentWrapperProps> = (props) => (
  <LazyWrapper>
    <LogRateAnalysisContentWrapperLazy {...props} />
  </LazyWrapper>
);

const LogCategorizationAppStateLazy = React.lazy(() => import('./components/log_categorization'));

/**
 * Lazy-wrapped LogCategorizationAppStateProps React component
 * @param {LogCategorizationAppStateProps}  props - properties specifying the data on which to run the analysis.
 */
export const LogCategorization: FC<LogCategorizationAppStateProps> = (props) => (
  <LazyWrapper>
    <LogCategorizationAppStateLazy {...props} />
  </LazyWrapper>
);

const LogCategorizationForDiscoverLazy = React.lazy(
  () =>
    import(
      './components/log_categorization/log_categorization_for_embeddable/log_categorization_for_discover_wrapper'
    )
);

/**
 * Lazy-wrapped LogCategorizationForDiscover React component
 * @param {LogCategorizationEmbeddableWrapperProps}  props - properties specifying the data on which to run the analysis.
 */
export const LogCategorizationForDiscover: FC<LogCategorizationEmbeddableWrapperProps> = (
  props
) => (
  <LazyWrapper>
    <LogCategorizationForDiscoverLazy {...props} />
  </LazyWrapper>
);

const ChangePointDetectionLazy = React.lazy(() => import('./components/change_point_detection'));
/**
 * Lazy-wrapped ChangePointDetectionAppStateProps React component
 * @param {ChangePointDetectionAppStateProps}  props - properties specifying the data on which to run the analysis.
 */
export const ChangePointDetection: FC<ChangePointDetectionAppStateProps> = (props) => (
  <LazyWrapper>
    <ChangePointDetectionLazy {...props} />
  </LazyWrapper>
);
