/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useCallback } from 'react';

import {
  EuiPage,
  EuiPageBody,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiPanel,
  useEuiTheme,
  useEuiBreakpoint,
} from '@elastic/eui';
import { kbnFullBodyHeightCss } from '@kbn/css-utils/public/full_body_height_css';
import { css } from '@emotion/react';
import {
  SearchProfilerTabs,
  ProfileTree,
  HighlightDetailsFlyout,
  LicenseWarningNotice,
  ProfileLoadingPlaceholder,
  EmptyTreePlaceHolder,
  ProfileQueryEditor,
} from './components';

import { useAppContext, useProfilerActionContext, useProfilerReadContext } from './contexts';
import { hasAggregations, hasSearch } from './lib';
import type { Targets } from './types';

const useStyles = () => {
  const { euiTheme } = useEuiTheme();

  return {
    // App root page container
    appRoot: css([
      {
        overflow: 'hidden',
        flex: '1 1 auto',
      }, // adding dev tool top bar to the body offset
      kbnFullBodyHeightCss(`(${euiTheme.size.base} * 3)`),
    ]),

    // Page body container
    pageBody: css`
      height: 100%;
      flex: 1 1 auto;
    `,

    // Page body content panel
    pageBodyContent: css`
      height: 100%;
    `,

    // Main body group
    bodyGroup: css`
      height: 100%;
    `,

    // Main content area
    main: css`
      height: 100%;
      flex-grow: 1;
      order: 2;
      margin-left: ${euiTheme.size.base};
      display: flex;
      overflow: hidden;
      flex-direction: column;

      // Make only the tab content scroll
      .search-profiler-tabs {
        flex-shrink: 0;
      }

      ${useEuiBreakpoint(['xs', 's'])} {
        flex: 0 0 auto;
        margin: ${euiTheme.size.base} 0;
      }
    `,
  };
};

export const App = () => {
  const { getLicenseStatus, notifications } = useAppContext();

  const { activeTab, currentResponse, highlightDetails, pristine, profiling } =
    useProfilerReadContext();

  const dispatch = useProfilerActionContext();
  const styles = useStyles();

  const handleProfileTreeError = (e: Error) => {
    notifications.addError(e, {
      title: i18n.translate('xpack.searchProfiler.profileTreeErrorRenderTitle', {
        defaultMessage: 'Profile data cannot be parsed.',
      }),
    });
  };

  const setActiveTab = useCallback(
    (target: Targets) => dispatch({ type: 'setActiveTab', value: target }),
    [dispatch]
  );

  const onHighlight = useCallback(
    (value: any) => dispatch({ type: 'setHighlightDetails', value }),
    [dispatch]
  );

  const renderLicenseWarning = () => {
    return !getLicenseStatus().valid ? (
      <>
        <LicenseWarningNotice />
        <EuiSpacer size="s" />
      </>
    ) : null;
  };

  const renderProfileTreeArea = () => {
    if (profiling) {
      return <ProfileLoadingPlaceholder />;
    }

    if (activeTab) {
      return (
        <ProfileTree
          onDataInitError={handleProfileTreeError}
          onHighlight={onHighlight}
          target={activeTab}
          data={currentResponse}
        />
      );
    }

    if (getLicenseStatus().valid && pristine) {
      return <EmptyTreePlaceHolder />;
    }

    return null;
  };

  return (
    <>
      <EuiPage css={styles.appRoot}>
        <EuiPageBody css={styles.pageBody}>
          {renderLicenseWarning()}
          <EuiPanel css={styles.pageBodyContent}>
            <EuiFlexGroup responsive={false} gutterSize="s" direction="row" css={styles.bodyGroup}>
              <EuiFlexItem>
                <ProfileQueryEditor />
              </EuiFlexItem>
              <EuiFlexItem grow={3}>
                <EuiFlexGroup css={styles.main} gutterSize="none" direction="column">
                  <SearchProfilerTabs
                    activeTab={activeTab}
                    activateTab={setActiveTab}
                    has={{
                      aggregations: Boolean(currentResponse && hasAggregations(currentResponse)),
                      searches: Boolean(currentResponse && hasSearch(currentResponse)),
                    }}
                  />
                  {renderProfileTreeArea()}
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
            {highlightDetails ? (
              <HighlightDetailsFlyout
                {...highlightDetails}
                onClose={() => dispatch({ type: 'setHighlightDetails', value: null })}
              />
            ) : null}
          </EuiPanel>
        </EuiPageBody>
      </EuiPage>
    </>
  );
};
