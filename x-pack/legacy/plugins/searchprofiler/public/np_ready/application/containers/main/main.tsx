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
} from '@elastic/eui';
import { ProfileQueryEditor } from '../';

import {
  SearchProfilerTabs,
  ProfileTree,
  HighlightDetailsFlyout,
  OnHighlightChangeArgs,
} from '../../components';

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
  const [activeTab, setActiveTab] = useState<Targets | null>(null);
  const [showDetailsFlyout, setShowDetailsFlyout] = useState<boolean>(false);
  const [currentResponse, setCurrentResponse] = useState<ShardSerialized[] | null>(null);

  const [highlightedDetails, setHighlightedDetails] = useState<OnHighlightChangeArgs | null>(null);

  const onHighlight = useCallback(
    (args: OnHighlightChangeArgs) => {
      setHighlightedDetails(args);
      setShowDetailsFlyout(true);
    },
    [currentResponse]
  );

  const onProfileClick = () => {
    setHighlightedDetails(null);
  };

  const onResponse = (resp: ShardSerialized[]) => {
    setCurrentResponse(resp);
    setActiveTab('searches');
  };

  return (
    <>
      <EuiPage className="prfDevTool__page">
        <EuiPageBody className="prfDevTool__page__pageBody">
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
                      activateTab={(target: Targets) => setActiveTab(target)}
                      has={{
                        aggregations: Boolean(currentResponse && hasAggregations(currentResponse)),
                        searches: Boolean(currentResponse && hasSearch(currentResponse)),
                      }}
                    />
                    {activeTab ? (
                      <div className="prfDevTool__main__profiletree">
                        <ProfileTree
                          onHighlight={onHighlight}
                          target={activeTab}
                          data={currentResponse}
                        />
                      </div>
                    ) : (
                      <EmptyTreePlaceHolder />
                    )}
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
