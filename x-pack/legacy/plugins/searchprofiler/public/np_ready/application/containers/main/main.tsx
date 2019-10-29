/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';
import _ from 'lodash';

import {
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';
import { ProfileQueryEditor } from '../';

import {
  SearchProfilerTabs,
  ProfileTree,
  HighlightDetailsFlyout,
  LicenseWarningNotice,
} from '../../components';

import { useAppContext } from '../../contexts/app_context';

import { EmptyTreePlaceHolder, ProfileLoadingPlaceholder } from './components';
import { Targets, ShardSerialized } from '../../types';
import { useProfilerActionContext, useProfilerReadContext } from '../../contexts/profiler_context';

function hasSearch(profileResponse: ShardSerialized[]) {
  const aggs = _.get(profileResponse, '[0].searches', []);
  return aggs.length > 0;
}

function hasAggregations(profileResponse: ShardSerialized[]) {
  const aggs = _.get(profileResponse, '[0].aggregations', []);
  return aggs.length > 0;
}

export const Main = () => {
  const { licenseEnabled } = useAppContext();

  const {
    activeTab,
    currentResponse,
    highlightDetails,
    pristine,
    profiling,
  } = useProfilerReadContext();
  const dispatch = useProfilerActionContext();

  const setActiveTab = useCallback(
    (target: Targets) => dispatch({ type: 'setActiveTab', value: target }),
    [dispatch]
  );

  const onHighlight = useCallback(value => dispatch({ type: 'setHighlightDetails', value }), [
    dispatch,
  ]);

  const renderLicenseWarning = () => {
    return !licenseEnabled ? (
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
        <div className="prfDevTool__main__profiletree">
          <ProfileTree onHighlight={onHighlight} target={activeTab} data={currentResponse} />
        </div>
      );
    }

    if (licenseEnabled && pristine) {
      return <EmptyTreePlaceHolder />;
    }

    return null;
  };

  return (
    <>
      <EuiPage className="prfDevTool__page">
        <EuiPageBody className="prfDevTool__page__pageBody">
          {renderLicenseWarning()}
          <EuiPageContent className="prfDevTool__page__pageBodyContent">
            <EuiPageContentBody className="prfDevTool__page__pageBodyContentBody">
              <EuiFlexGroup
                responsive={false}
                gutterSize="s"
                direction="row"
                className="prfDevTool__page__bodyGroup"
              >
                <EuiFlexItem>
                  <ProfileQueryEditor />
                </EuiFlexItem>
                <EuiFlexItem grow={3}>
                  <EuiFlexGroup className="prfDevTool__main" gutterSize="none" direction="column">
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
            </EuiPageContentBody>
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    </>
  );
};
