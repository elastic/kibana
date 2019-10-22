/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useState } from 'react';
import _ from 'lodash';

import { ProfileQueryEditor } from '.';

import {
  SearchProfilerTabs,
  ProfileTree,
  HighlightDetailsFlyout,
  OnHighlightChangeArgs,
} from '../components';
import { Targets, ShardSerialized } from '../types';

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

  return (
    <>
      <div className="prfDevTool__container">
        <div className="prfDevTool__main">
          <SearchProfilerTabs
            activeTab={activeTab}
            activateTab={(target: Targets) => setActiveTab(target)}
            has={{
              aggregations: Boolean(currentResponse && hasAggregations(currentResponse)),
              searches: Boolean(currentResponse && hasSearch(currentResponse)),
            }}
          />
          {activeTab ? (
            <ProfileTree onHighlight={onHighlight} target={activeTab} data={currentResponse} />
          ) : null}
        </div>
      </div>
      <div className="prfDevTool__sense">
        <ProfileQueryEditor onResponse={resp => setCurrentResponse(resp)} />
        {showDetailsFlyout ? (
          <HighlightDetailsFlyout
            {...highlightedDetails!}
            onClose={() => setShowDetailsFlyout(false)}
          />
        ) : null}
      </div>
    </>
  );
};
