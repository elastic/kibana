/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import PropTypes from 'prop-types';
import React, { Component, Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty, EuiTabbedContent, EuiLoadingSpinner } from '@elastic/eui';

import { extractJobDetails } from './extract_job_details';
import { JsonPane } from './json_tab';
import { DatafeedPreviewPane } from './datafeed_preview_tab';
import { AnnotationsTable } from '../../../../components/annotations/annotations_table';
import { DatafeedChartFlyout } from '../datafeed_chart_flyout';
import { AnnotationFlyout } from '../../../../components/annotations/annotation_flyout';
import { RevertModelSnapshotFlyout } from '../../../../components/model_snapshots/revert_model_snapshot_flyout';
import { ModelSnapshotTable } from '../../../../components/model_snapshots';
import { ForecastsTable } from './forecasts_table';
import { JobDetailsPane } from './job_details_pane';
import { JobMessagesPane } from './job_messages_pane';
import { withKibana } from '@kbn/kibana-react-plugin/public';

export class JobDetailsUI extends Component {
  constructor(props) {
    super(props);

    this.state = {
      datafeedChartFlyoutVisible: false,
      modelSnapshot: null,
      revertSnapshotFlyoutVisible: false,
    };
    if (this.props.addYourself) {
      this.props.addYourself(props.jobId, (j) => this.updateJob(j));
    }
  }

  componentWillUnmount() {
    this.props.removeYourself(this.props.jobId);
  }

  updateJob(job) {
    this.setState({ job });
  }

  render() {
    const job = this.state.job ?? this.props.job;
    const {
      services: {
        http: { basePath },
      },
    } = this.props.kibana;

    if (job === undefined) {
      return (
        <div className="job-loading-spinner" data-test-subj="mlJobDetails loading">
          <EuiLoadingSpinner size="l" />
        </div>
      );
    } else {
      const { refreshJobList, showClearButton } = this.props;

      const {
        general,
        customUrl,
        node,
        calendars,
        detectors,
        influencers,
        analysisConfig,
        analysisLimits,
        dataDescription,
        customSettings,
        jobTags,
        datafeed,
        counts,
        modelSizeStats,
        jobTimingStats,
        datafeedTimingStats,
        alertRules,
      } = extractJobDetails(job, basePath, refreshJobList);

      if (job.blocked === undefined) {
        datafeed.titleAction = (
          <EuiButtonEmpty
            onClick={() =>
              this.setState({
                datafeedChartFlyoutVisible: true,
              })
            }
            iconType="visAreaStacked"
            size="s"
          >
            <FormattedMessage
              id="xpack.ml.jobDetails.tabs.datafeed.viewCountsButtonText"
              defaultMessage="View datafeed counts"
            />
          </EuiButtonEmpty>
        );
      }

      const tabs = [
        {
          id: 'job-settings',
          'data-test-subj': 'mlJobListTab-job-settings',
          name: i18n.translate('xpack.ml.jobsList.jobDetails.tabs.jobSettingsLabel', {
            defaultMessage: 'Job settings',
          }),
          content: (
            <JobDetailsPane
              data-test-subj="mlJobDetails-job-settings"
              sections={[general, customSettings, customUrl, jobTags, node, calendars, alertRules]}
            />
          ),
          time: job.open_time,
        },
        {
          id: 'job-config',
          'data-test-subj': 'mlJobListTab-job-config',
          name: i18n.translate('xpack.ml.jobsList.jobDetails.tabs.jobConfigLabel', {
            defaultMessage: 'Job config',
          }),
          content: (
            <JobDetailsPane
              data-test-subj="mlJobDetails-job-config"
              sections={[detectors, influencers, analysisConfig, analysisLimits, dataDescription]}
            />
          ),
        },
        {
          id: 'datafeed',
          'data-test-subj': 'mlJobListTab-datafeed',
          name: i18n.translate('xpack.ml.jobsList.jobDetails.tabs.datafeedLabel', {
            defaultMessage: 'Datafeed',
          }),
          content: (
            <>
              <JobDetailsPane
                data-test-subj="mlJobDetails-datafeed"
                sections={[datafeed, datafeedTimingStats]}
              />
              {this.props.jobId && this.state.datafeedChartFlyoutVisible ? (
                <DatafeedChartFlyout
                  onClose={() => {
                    this.setState({
                      datafeedChartFlyoutVisible: false,
                    });
                  }}
                  onModelSnapshotAnnotationClick={(modelSnapshot) => {
                    this.setState({
                      modelSnapshot,
                      revertSnapshotFlyoutVisible: true,
                      datafeedChartFlyoutVisible: false,
                    });
                  }}
                  end={job.data_counts.latest_bucket_timestamp}
                  jobId={this.props.jobId}
                />
              ) : null}
              {this.state.revertSnapshotFlyoutVisible === true &&
              this.state.modelSnapshot !== null ? (
                <RevertModelSnapshotFlyout
                  snapshot={this.state.modelSnapshot}
                  snapshots={[this.state.modelSnapshot]}
                  job={job}
                  closeFlyout={() => {
                    this.setState({
                      revertSnapshotFlyoutVisible: false,
                    });
                  }}
                  refresh={refreshJobList}
                />
              ) : null}
            </>
          ),
        },
        ...(this.props.mode !== 'flyout'
          ? [
              {
                id: 'counts',
                'data-test-subj': 'mlJobListTab-counts',
                name: i18n.translate('xpack.ml.jobsList.jobDetails.tabs.countsLabel', {
                  defaultMessage: 'Counts',
                }),
                content: (
                  <JobDetailsPane
                    data-test-subj="mlJobDetails-counts"
                    sections={[counts, modelSizeStats, jobTimingStats]}
                  />
                ),
              },
            ]
          : []),
        {
          id: 'json',
          'data-test-subj': 'mlJobListTab-json',
          name: i18n.translate('xpack.ml.jobsList.jobDetails.tabs.jsonLabel', {
            defaultMessage: 'JSON',
          }),
          content: <JsonPane job={job} />,
        },
        {
          id: 'job-messages',
          'data-test-subj': 'mlJobListTab-job-messages',
          name: i18n.translate('xpack.ml.jobsList.jobDetails.tabs.jobMessagesLabel', {
            defaultMessage: 'Job messages',
          }),
          content: (
            <JobMessagesPane
              jobId={job.job_id}
              refreshJobList={refreshJobList}
              showClearButton={showClearButton}
            />
          ),
        },
      ];

      if (this.props.mode !== 'flyout') {
        if (datafeed.items.length) {
          tabs.push(
            {
              id: 'datafeed-preview',
              disabled: job.blocked !== undefined,
              'data-test-subj': 'mlJobListTab-datafeed-preview',
              name: i18n.translate('xpack.ml.jobsList.jobDetails.tabs.datafeedPreviewLabel', {
                defaultMessage: 'Datafeed preview',
              }),
              content: <DatafeedPreviewPane job={job} />,
            },
            {
              id: 'forecasts',
              disabled: job.blocked !== undefined,
              'data-test-subj': 'mlJobListTab-forecasts',
              name: i18n.translate('xpack.ml.jobsList.jobDetails.tabs.forecastsLabel', {
                defaultMessage: 'Forecasts',
              }),
              content: <ForecastsTable job={job} />,
            }
          );
        }

        tabs.push({
          id: 'annotations',
          disabled: job.blocked !== undefined,
          'data-test-subj': 'mlJobListTab-annotations',
          name: i18n.translate('xpack.ml.jobsList.jobDetails.tabs.annotationsLabel', {
            defaultMessage: 'Annotations',
          }),
          content: (
            <Fragment>
              <AnnotationsTable jobs={[job]} refreshJobList={refreshJobList} />
              <AnnotationFlyout />
            </Fragment>
          ),
        });

        tabs.push({
          id: 'modelSnapshots',
          disabled: job.blocked !== undefined,
          'data-test-subj': 'mlJobListTab-modelSnapshots',
          name: i18n.translate('xpack.ml.jobsList.jobDetails.tabs.modelSnapshotsLabel', {
            defaultMessage: 'Model snapshots',
          }),
          content: (
            <Fragment>
              <ModelSnapshotTable job={job} refreshJobList={refreshJobList} />
            </Fragment>
          ),
        });
      }
      return (
        <div className="tab-contents" data-test-subj={`mlJobListRowDetails details-${job.job_id}`}>
          <EuiTabbedContent tabs={tabs} initialSelectedTab={tabs[0]} onTabClick={() => {}} />
        </div>
      );
    }
  }
}
JobDetailsUI.propTypes = {
  jobId: PropTypes.string.isRequired,
  job: PropTypes.object,
  addYourself: PropTypes.func.isRequired,
  removeYourself: PropTypes.func.isRequired,
  refreshJobList: PropTypes.func,
};

export const JobDetails = withKibana(JobDetailsUI);
