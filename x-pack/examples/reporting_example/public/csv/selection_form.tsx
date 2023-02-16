/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiErrorBoundary,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormFieldset,
  EuiPanel,
  EuiSuperDatePicker,
  EuiSwitch,
} from '@elastic/eui';
import { CoreStart } from '@kbn/core/public';
import { TimeRange } from '@kbn/data-plugin/common';
import { SavedObjectFinder } from '@kbn/saved-objects-finder-plugin/public';
import { SavedObjectsManagementPluginStart } from '@kbn/saved-objects-management-plugin/public';
import { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import { SharePluginSetup } from '@kbn/share-plugin/public';
import React, { Dispatch, SetStateAction } from 'react';

interface SelectionFormProps {
  share: SharePluginSetup;
  core: CoreStart;
  savedObjectsManagement: SavedObjectsManagementPluginStart;
  savedObjectsTagging?: SavedObjectsTaggingApi;
  setSavedSearchId: Dispatch<SetStateAction<string | null>>;
  timeRangeChecked: boolean;
  checkTimeRange: Dispatch<SetStateAction<boolean>>;
  checkQuery: Dispatch<SetStateAction<boolean>>;
  timeRange: TimeRange;
  setTimeRange: Dispatch<SetStateAction<TimeRange>>;
  queryChecked: boolean;
  query: string | undefined;
  setQuery: Dispatch<SetStateAction<string | undefined>>;
}

const SEARCH_OBJECT_TYPE = 'search';

export const SelectionForm = (props: SelectionFormProps) => {
  const getSavedObjectFinderData = () => {
    return {
      metadata: {
        type: SEARCH_OBJECT_TYPE,
        getIconForSavedObject: () => 'discoverApp',
        name: 'Discover',
      },
      onChoose: (id: string) => {
        props.setSavedSearchId(id);
      },
    };
  };

  const finderData = getSavedObjectFinderData();
  if (!finderData) return null;

  const {
    core,
    savedObjectsManagement,
    savedObjectsTagging,
    timeRangeChecked,
    checkTimeRange,
    timeRange,
    setTimeRange,
    queryChecked,
    checkQuery,
    query,
    setQuery,
  } = props;
  const { savedObjects, uiSettings } = core;

  return (
    <EuiFormFieldset legend={{ children: finderData.metadata.name }}>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiPanel>
            <EuiFormFieldset legend={{ children: `Select a saved search` }}>
              <EuiErrorBoundary>
                <SavedObjectFinder
                  showFilter={false}
                  fixedPageSize={5}
                  services={{
                    savedObjects,
                    uiSettings,
                    savedObjectsManagement,
                    savedObjectsTagging,
                  }}
                  noItemsMessage="No matching searches found."
                  savedObjectMetaData={[finderData.metadata]}
                  onChoose={finderData.onChoose}
                />
              </EuiErrorBoundary>
            </EuiFormFieldset>
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel>
            <EuiSwitch
              label="Use custom time range"
              checked={timeRangeChecked}
              onChange={(e) => checkTimeRange(e.target.checked)}
            />
            <EuiSuperDatePicker
              start={timeRange?.from}
              end={timeRange?.to}
              showUpdateButton={false}
              isDisabled={!timeRangeChecked}
              onTimeChange={(p) => setTimeRange({ from: p.start, to: p.end })}
            />
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel>
            <EuiSwitch
              label="Use custom KQL query"
              checked={queryChecked}
              onChange={(e) => checkQuery(e.target.checked)}
            />
            <EuiFieldSearch
              placeholder="Search"
              value={query}
              disabled={!queryChecked}
              onChange={(e) => setQuery(e.target.value)}
            />
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormFieldset>
  );
};
