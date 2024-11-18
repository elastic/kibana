/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { Suspense, useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPagination,
  EuiProgress,
} from '@elastic/eui';
import usePrevious from 'react-use/lib/usePrevious';
import { DefaultAlertsFlyoutHeader } from './default_alerts_flyout';
import { FlyoutSectionRenderer } from '../../../../types';

const PAGINATION_LABEL = i18n.translate(
  'xpack.triggersActionsUI.sections.alertsTable.alertsFlyout.paginationLabel',
  {
    defaultMessage: 'Alert navigation',
  }
);

export const AlertsFlyout: FlyoutSectionRenderer = ({ alert, ...renderContext }) => {
  const {
    flyoutIndex,
    alertsCount,
    onClose,
    onPaginate,
    isLoading,
    renderFlyoutHeader: Header = DefaultAlertsFlyoutHeader,
    renderFlyoutBody: Body,
    renderFlyoutFooter: Footer,
  } = renderContext;
  const prevAlert = usePrevious(alert);
  const props = useMemo(
    () => ({
      ...renderContext,
      // Show the previous alert while loading the next one
      alert: alert === undefined && prevAlert != null ? prevAlert : alert,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [alert, renderContext]
  );

  const FlyoutHeader = useCallback(
    () =>
      Header ? (
        <Suspense fallback={null}>
          <Header {...props} />
        </Suspense>
      ) : null,
    [Header, props]
  );

  const FlyoutBody = useCallback(
    () =>
      Body ? (
        <Suspense fallback={null}>
          <Body {...props} />
        </Suspense>
      ) : null,
    [Body, props]
  );

  const FlyoutFooter = useCallback(
    () =>
      Footer ? (
        <Suspense fallback={null}>
          <Footer {...props} />
        </Suspense>
      ) : null,
    [Footer, props]
  );

  return (
    <EuiFlyout onClose={onClose} size="m" data-test-subj="alertsFlyout" ownFocus={false}>
      {isLoading && <EuiProgress size="xs" color="accent" data-test-subj="alertsFlyoutLoading" />}
      <EuiFlyoutHeader hasBorder>
        <FlyoutHeader />
        <EuiSpacer size="m" />
        <EuiFlexGroup gutterSize="none" justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiPagination
              aria-label={PAGINATION_LABEL}
              pageCount={alertsCount}
              activePage={flyoutIndex}
              onPageClick={onPaginate}
              compressed
              data-test-subj="alertsFlyoutPagination"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <FlyoutBody />
      <FlyoutFooter />
    </EuiFlyout>
  );
};
