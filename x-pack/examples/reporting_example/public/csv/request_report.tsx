/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonGroup,
  EuiCodeBlock,
  EuiFormFieldset,
  EuiListGroup,
  EuiSpacer,
} from '@elastic/eui';
import { CoreStart } from '@kbn/core/public';
import { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import rison from '@kbn/rison';
import React, { useState } from 'react';

const REPORTING_CSV_GENERATE_ENDPOINT = '/api/reporting/generate/csv_saved_object';

interface ReportingRequestProps {
  core: CoreStart;
  locatorParams: DiscoverAppLocatorParams | undefined;
}

export const ReportingRequest = (props: ReportingRequestProps) => {
  interface ReportJobJSON {
    path: string;
    job: { id: string };
  }

  const getJobParams = () => {
    return rison.encode({
      browserTimezone: 'UTC',
      objectType: 'search',
      locatorParams: [locatorParams],
    });
  };

  const [showQueryString, setShowQueryString] = useState(true);
  const [response, setResponse] = useState<ReportJobJSON>();

  const idPrefix = 'reportingRequest';

  const getReportingRequest = () =>
    showQueryString
      ? `POST ${REPORTING_CSV_GENERATE_ENDPOINT}?jobParams=` + encodeURI(getJobParams())
      : `POST ${REPORTING_CSV_GENERATE_ENDPOINT}` +
        `\n{ "jobParams": "${encodeURI(getJobParams())}" }`;

  const toggleButtons = [
    {
      id: `${idPrefix}--query-string`,
      label: 'Query string format',
    },
    {
      id: `${idPrefix}--post-data`,
      label: 'Post data format',
    },
  ];

  const onChange = (id: string) => {
    setShowQueryString(id === toggleButtons[0].id);
  };

  const { core, locatorParams } = props;
  const { http } = core;

  const sendReportingRequest = async () => {
    if (locatorParams) {
      const responseTmp = await http.post<ReportJobJSON>(REPORTING_CSV_GENERATE_ENDPOINT, {
        query: { jobParams: getJobParams() },
      });
      setResponse(responseTmp);
    }
  };

  const listItems = response && [
    {
      label: 'View in Stack Management',
      href: http.basePath.prepend('/app/management/insightsAndAlerting/reporting'),
      iconType: 'visTable',
    },
    {
      label: `Download report job [${response.job.id}]`,
      href: response.path,
      iconType: 'download',
      toolTipText: 'The report may take a few seconds to complete.',
    },
  ];

  return (
    <>
      <EuiFormFieldset legend={{ children: `Reporting Request` }}>
        <EuiButtonGroup
          isDisabled={locatorParams == null}
          legend="toggle to show request in different formats"
          type="single"
          options={toggleButtons}
          idSelected={showQueryString ? `${idPrefix}--query-string` : `${idPrefix}--post-data`}
          onChange={onChange}
        />
        <EuiCodeBlock isCopyable>
          {locatorParams ? getReportingRequest() : '<Choose a saved object>'}
        </EuiCodeBlock>
      </EuiFormFieldset>

      <EuiSpacer />
      <EuiButton onClick={sendReportingRequest} isDisabled={locatorParams == null}>
        Send Report Request
      </EuiButton>

      {response ? (
        <>
          <EuiSpacer />
          <EuiListGroup listItems={listItems} />
          <EuiFormFieldset legend={{ children: `Raw response` }}>
            <EuiCodeBlock language="json" isCopyable whiteSpace="pre">
              {JSON.stringify(response, null, ' ')}
            </EuiCodeBlock>
          </EuiFormFieldset>
        </>
      ) : null}
    </>
  );
};
