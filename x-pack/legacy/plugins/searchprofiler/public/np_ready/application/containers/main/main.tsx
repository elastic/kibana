/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useState } from 'react';
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
  OnHighlightChangeArgs,
  LicenseWarningNotice,
} from '../../components';

import { useAppContext } from '../../app_context';

import { EmptyTreePlaceHolder } from './components';
import { Targets, ShardSerialized } from '../../types';

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

  const [activeTab, setActiveTab] = useState<Targets | null>(null);
  const [showDetailsFlyout, setShowDetailsFlyout] = useState<boolean>(false);
  const [currentResponse, setCurrentResponse] = useState<ShardSerialized[] | null>(null);
  const [highlightedDetails, setHighlightedDetails] = useState<OnHighlightChangeArgs | null>(null);

  const onHighlight = useCallback(
    (args: OnHighlightChangeArgs) => {
      setHighlightedDetails(() => args);
      setShowDetailsFlyout(() => true);
    },
    [currentResponse]
  );

  const onProfileClick = useCallback(() => {
    setHighlightedDetails(() => null);
  }, []);

  const onResponse = useCallback((resp: ShardSerialized[]) => {
    setCurrentResponse(() => resp);
    setActiveTab(() => 'searches');
  }, []);

  const setActiveTabCb = useCallback((target: Targets) => setActiveTab(() => target), []);

  const renderLicenseWarning = () => {
    return !licenseEnabled ? (
      <>
        <LicenseWarningNotice />
        <EuiSpacer size="s" />
      </>
    ) : null;
  };

  const renderProfileTreeArea = () => {
    if (activeTab) {
      return (
        <div className="prfDevTool__main__profiletree">
          <ProfileTree onHighlight={onHighlight} target={activeTab} data={currentResponse} />
        </div>
      );
    }

    if (licenseEnabled) {
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
              <EuiFlexGroup gutterSize="s" direction="row" className="prfDevTool__page__bodyGroup">
                <EuiFlexItem>
                  <ProfileQueryEditor onProfileClick={onProfileClick} onResponse={onResponse} />
                </EuiFlexItem>
                <EuiFlexItem grow={3}>
                  <EuiFlexGroup className="prfDevTool__main" gutterSize="none" direction="column">
                    <SearchProfilerTabs
                      activeTab={activeTab}
                      activateTab={setActiveTabCb}
                      has={{
                        aggregations: Boolean(currentResponse && hasAggregations(currentResponse)),
                        searches: Boolean(currentResponse && hasSearch(currentResponse)),
                      }}
                    />
                    {renderProfileTreeArea()}
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
              {showDetailsFlyout ? (
                <HighlightDetailsFlyout
                  {...highlightedDetails!}
                  onClose={() => setShowDetailsFlyout(false)}
                />
              ) : null}
            </EuiPageContentBody>
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    </>
  );
};
