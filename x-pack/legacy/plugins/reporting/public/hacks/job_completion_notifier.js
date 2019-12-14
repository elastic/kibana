/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { toastNotifications } from 'ui/notify';
import { uiModules } from 'ui/modules';
import { get } from 'lodash';
import { jobQueueClient } from 'plugins/reporting/lib/job_queue_client';
import { jobCompletionNotifications } from 'plugins/reporting/lib/job_completion_notifications';
import { JobStatuses } from '../constants/job_statuses';
import { Path } from 'plugins/xpack_main/services/path';
import { xpackInfo } from 'plugins/xpack_main/services/xpack_info';
import { Poller } from '../../../../common/poller';
import { EuiButton } from '@elastic/eui';
import { downloadReport } from '../lib/download_report';
import { npStart } from 'ui/new_platform';

/**
 * Poll for changes to reports. Inform the user of changes when the license is active.
 */
uiModules.get('kibana').run(reportingPollConfig => {
  // Don't show users any reporting toasts until they're logged in.
  if (Path.isUnauthenticated()) {
    return;
  }

  // We assume that all license types offer Reporting, and that we only need to check if the
  // license is active or expired.
  const isLicenseActive = xpackInfo.getLicense().isActive;

  async function showCompletionNotification(job) {
    const reportObjectTitle = job._source.payload.title;
    const reportObjectType = job._source.payload.type;

    const isJobSuccessful = get(job, '_source.status') === JobStatuses.COMPLETED;

    if (!isJobSuccessful) {
      const errorDoc = await jobQueueClient.getContent(job._id);
      const text = errorDoc.content;
      return toastNotifications.addDanger({
        title: (
          <FormattedMessage
            id="xpack.reporting.jobCompletionNotifier.couldNotCreateReportTitle"
            defaultMessage="Couldn't create report for {reportObjectType} '{reportObjectTitle}'"
            values={{ reportObjectType, reportObjectTitle }}
          />
        ),
        text,
      });
    }

    let seeReportLink;

    const { chrome } = npStart.core;

    // In-case the license expired/changed between the time they queued the job and the time that
    // the job completes, that way we don't give the user a toast to download their report if they can't.
    // NOTE: this should be looking at configuration rather than the existence of a navLink
    if (chrome.navLinks.has('kibana:management')) {
      const { baseUrl } = chrome.navLinks.get('kibana:management');
      const reportingSectionUrl = `${baseUrl}/kibana/reporting`;

      seeReportLink = (
        <p>
          <FormattedMessage
            id="xpack.reporting.jobCompletionNotifier.reportLink.pickItUpFromPathDescription"
            defaultMessage="Pick it up from {path}."
            values={{
              path: (
                <a href={reportingSectionUrl}>
                  <FormattedMessage
                    id="xpack.reporting.jobCompletionNotifier.reportLink.reportingSectionUrlLinkLabel"
                    defaultMessage="Management &gt; Kibana &gt; Reporting"
                  />
                </a>
              ),
            }}
          />
        </p>
      );
    }

    const downloadReportButton = (
      <EuiButton
        size="s"
        data-test-subj="downloadCompletedReportButton"
        onClick={() => {
          downloadReport(job._id);
        }}
      >
        <FormattedMessage
          id="xpack.reporting.jobCompletionNotifier.downloadReportButtonLabel"
          defaultMessage="Download report"
        />
      </EuiButton>
    );

    const maxSizeReached = get(job, '_source.output.max_size_reached');
    const csvContainsFormulas = get(job, '_source.output.csv_contains_formulas');

    if (csvContainsFormulas) {
      return toastNotifications.addWarning({
        title: (
          <FormattedMessage
            id="xpack.reporting.jobCompletionNotifier.csvContainsFormulas.formulaReportTitle"
            defaultMessage="Report may contain formulas {reportObjectType} '{reportObjectTitle}'"
            values={{ reportObjectType, reportObjectTitle }}
          />
        ),
        text: (
          <div>
            <p>
              <FormattedMessage
                id="xpack.reporting.jobCompletionNotifier.csvContainsFormulas.formulaReportMessage"
                defaultMessage="The report contains characters which spreadsheet applications can interpret as formulas."
              />
            </p>
            {seeReportLink}
            {downloadReportButton}
          </div>
        ),
        'data-test-subj': 'completeReportSuccess',
      });
    }

    if (maxSizeReached) {
      return toastNotifications.addWarning({
        title: (
          <FormattedMessage
            id="xpack.reporting.jobCompletionNotifier.maxSizeReached.partialReportTitle"
            defaultMessage="Created partial report for {reportObjectType} '{reportObjectTitle}'"
            values={{ reportObjectType, reportObjectTitle }}
          />
        ),
        text: (
          <div>
            <p>
              <FormattedMessage
                id="xpack.reporting.jobCompletionNotifier.maxSizeReached.partialReportDescription"
                defaultMessage="The report reached the max size and contains partial data."
              />
            </p>
            {seeReportLink}
            {downloadReportButton}
          </div>
        ),
        'data-test-subj': 'completeReportSuccess',
      });
    }

    toastNotifications.addSuccess({
      title: (
        <FormattedMessage
          id="xpack.reporting.jobCompletionNotifier.successfullyCreatedReportNotificationTitle"
          defaultMessage="Created report for {reportObjectType} '{reportObjectTitle}'"
          values={{ reportObjectType, reportObjectTitle }}
        />
      ),
      text: (
        <div>
          {seeReportLink}
          {downloadReportButton}
        </div>
      ),
      'data-test-subj': 'completeReportSuccess',
    });
  }

  const { jobCompletionNotifier } = reportingPollConfig;

  const poller = new Poller({
    functionToPoll: async () => {
      if (!isLicenseActive) {
        return;
      }

      const jobIds = jobCompletionNotifications.getAll();
      if (!jobIds.length) {
        return;
      }

      const jobs = await jobQueueClient.list(0, jobIds);
      jobIds.forEach(async jobId => {
        const job = jobs.find(j => j._id === jobId);
        if (!job) {
          jobCompletionNotifications.remove(jobId);
          return;
        }

        if (
          job._source.status === JobStatuses.COMPLETED ||
          job._source.status === JobStatuses.FAILED
        ) {
          await showCompletionNotification(job);
          jobCompletionNotifications.remove(job.id);
          return;
        }
      });
    },
    pollFrequencyInMillis: jobCompletionNotifier.interval,
    trailing: true,
    continuePollingOnError: true,
    pollFrequencyErrorMultiplier: jobCompletionNotifier.intervalErrorMultiplier,
  });
  poller.start();
});
