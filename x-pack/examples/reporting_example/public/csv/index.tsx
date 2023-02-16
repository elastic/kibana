/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCodeBlock, EuiFormFieldset, EuiSpacer } from '@elastic/eui';
import { CoreStart } from '@kbn/core/public';
import { DiscoverAppLocatorParams, DISCOVER_APP_LOCATOR } from '@kbn/discover-plugin/common';
import { TimeRange } from '@kbn/es-query/src/filters/helpers';
import { SavedObjectsManagementPluginStart } from '@kbn/saved-objects-management-plugin/public';
import { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import { SharePluginSetup } from '@kbn/share-plugin/public';
import React, { useEffect, useState } from 'react';
import { ReportingRequest } from './request_report';
import { SelectionForm } from './selection_form';

interface CsvExplorerProps {
  share: SharePluginSetup;
  core: CoreStart;
  savedObjectsManagement: SavedObjectsManagementPluginStart;
  savedObjectsTagging?: SavedObjectsTaggingApi;
}

export const CsvExplorer = (props: CsvExplorerProps) => {
  const { share, core } = props;

  const [savedSearchId, setSavedSearchId] = useState<string | null>(null);
  const [timeRangeChecked, checkTimeRange] = useState(false);
  const [queryChecked, checkQuery] = useState(false);

  const defaultTimeRange = { from: 'now-15m', to: 'now' };
  const [timeRange, setTimeRange] = useState<TimeRange>(defaultTimeRange);
  const [query, setQuery] = useState<string>();

  const [locatorParams, setLocatorParams] = useState<DiscoverAppLocatorParams>();

  useEffect(() => {
    const locator = share.url.locators.get(DISCOVER_APP_LOCATOR);
    if (locator && savedSearchId !== null) {
      const params = {
        id: DISCOVER_APP_LOCATOR,
        params: {
          savedSearchId,
          ...(timeRangeChecked && timeRange ? { timeRange } : {}),
          ...(queryChecked && query ? { query: { query, language: 'kql' } } : {}),
        } as DiscoverAppLocatorParams,
      };

      setLocatorParams(params);
    }
  }, [share, savedSearchId, timeRange, query, timeRangeChecked, queryChecked]);

  const LocatorParamsObject = () => (
    <EuiFormFieldset legend={{ children: `Locator` }}>
      <EuiCodeBlock language="json" isCopyable whiteSpace="pre">
        {locatorParams ? JSON.stringify(locatorParams, null, ' ') : '<Choose a saved object>'}
      </EuiCodeBlock>
    </EuiFormFieldset>
  );

  return (
    <>
      <p>
        Discover is integrated with the locator service. Use the form to create a custom link, and a
        Reporting POST URL.
      </p>

      <EuiSpacer />
      <SelectionForm
        {...props}
        setSavedSearchId={setSavedSearchId}
        checkTimeRange={checkTimeRange}
        checkQuery={checkQuery}
        setTimeRange={setTimeRange}
        setQuery={setQuery}
        timeRangeChecked={timeRangeChecked}
        timeRange={timeRange}
        queryChecked={queryChecked}
        query={query}
      />

      <EuiSpacer />
      <LocatorParamsObject />

      <EuiSpacer />
      <ReportingRequest core={core} locatorParams={locatorParams} />
    </>
  );
};
