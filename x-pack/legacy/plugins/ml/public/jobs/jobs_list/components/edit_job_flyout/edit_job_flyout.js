/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import PropTypes from 'prop-types';
import React, {
  Component,
} from 'react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTabbedContent,
} from '@elastic/eui';

import { JobDetails, Detectors, Datafeed, CustomUrls } from './tabs';
import { saveJob } from './edit_utils';
import { loadFullJob } from '../utils';
import {
  validateModelMemoryLimit,
  validateGroupNames,
  isValidCustomUrls } from '../validate_job';
import { mlMessageBarService } from '../../../../components/messagebar/messagebar_service';
import { toastNotifications } from 'ui/notify';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';

class EditJobFlyoutUI extends Component {
  constructor(props) {
    super(props);

    this.state = {
      job: {},
      hasDatafeed: false,
      isFlyoutVisible: false,
      jobDescription: '',
      jobGroups: [],
      jobModelMemoryLimit: '',
      jobDetectors: [],
      jobDetectorDescriptions: [],
      jobCustomUrls: [],
      datafeedQuery: '',
      datafeedQueryDelay: '',
      datafeedFrequency: '',
      datafeedScrollSize: '',
      jobModelMemoryLimitValidationError: '',
      jobGroupsValidationError: '',
      isValidJobDetails: true,
      isValidJobCustomUrls: true,
    };

    this.refreshJobs = this.props.refreshJobs;
  }

  componentDidMount() {
    if (typeof this.props.setShowFunction === 'function') {
      this.props.setShowFunction(this.showFlyout);
    }
  }

  componentWillUnmount() {
    if (typeof this.props.unsetShowFunction === 'function') {
      this.props.unsetShowFunction();
    }
  }

  closeFlyout = () => {
    this.setState({ isFlyoutVisible: false });
  }

  showFlyout = (jobLite) => {
    const hasDatafeed = jobLite.hasDatafeed;
    loadFullJob(jobLite.id)
    	.then((job) => {
        this.extractJob(job, hasDatafeed);
        this.setState({
          job,
          isFlyoutVisible: true,
        });
      })
      .catch((error) => {
        console.error(error);
      });
  }

  extractJob(job, hasDatafeed) {
    const mml = (job.analysis_limits && job.analysis_limits.model_memory_limit) ?
      job.analysis_limits.model_memory_limit :
      '';
    const detectors = (job.analysis_config && job.analysis_config.detectors) ?
      job.analysis_config.detectors :
      '';

    const bucketSpan = (job.analysis_config) ? job.analysis_config.bucket_span : '';

    const datafeedConfig = job.datafeed_config;
    const frequency = (datafeedConfig.frequency !== undefined) ? datafeedConfig.frequency : '';
    const customUrls = (job.custom_settings && job.custom_settings.custom_urls) ?
      job.custom_settings.custom_urls : [];

    this.setState({
      job,
      hasDatafeed,
      jobDescription: job.description,
      jobGroups: (job.groups !== undefined) ?  job.groups : [],
      jobModelMemoryLimit: mml,
      jobDetectors: detectors,
      jobDetectorDescriptions: detectors.map(d => d.detector_description),
      jobBucketSpan: bucketSpan,
      jobCustomUrls: customUrls,
      datafeedQuery: (hasDatafeed) ? JSON.stringify(datafeedConfig.query, null, 2) : '',
      datafeedQueryDelay: (hasDatafeed) ? datafeedConfig.query_delay : '',
      datafeedFrequency: (hasDatafeed) ? frequency : '',
      datafeedScrollSize: (hasDatafeed) ? +datafeedConfig.scroll_size : '',
      jobModelMemoryLimitValidationError: '',
      jobGroupsValidationError: '',
    });
  }

  setJobDetails = (jobDetails) => {
    let { jobModelMemoryLimitValidationError, jobGroupsValidationError } = this.state;

    if (jobDetails.jobModelMemoryLimit !== undefined) {
      jobModelMemoryLimitValidationError = validateModelMemoryLimit(jobDetails.jobModelMemoryLimit).message;
    }

    if (jobDetails.jobGroups !== undefined) {
      if (jobDetails.jobGroups.some(j => this.props.allJobIds.includes(j))) {
        jobGroupsValidationError = this.props.intl.formatMessage({
          id: 'xpack.ml.jobsList.editJobFlyout.groupsAndJobsHasSameIdErrorMessage',
          defaultMessage: 'A job with this ID already exists. Groups and jobs cannot use the same ID.'
        });
      } else {
        jobGroupsValidationError = validateGroupNames(jobDetails.jobGroups).message;
      }
    }

    const isValidJobDetails = (jobModelMemoryLimitValidationError === '' && jobGroupsValidationError === '');

    this.setState({
      ...jobDetails,
      jobModelMemoryLimitValidationError,
      jobGroupsValidationError,
      isValidJobDetails,
    });
  }

  setDetectorDescriptions = (jobDetectorDescriptions) => {
    this.setState({
      ...jobDetectorDescriptions
    });
  }

  setDatafeed = (datafeed) => {
    this.setState({
      ...datafeed
    });
  }

  setCustomUrls = (jobCustomUrls) => {
    const isValidJobCustomUrls = isValidCustomUrls(jobCustomUrls);
    this.setState({
      jobCustomUrls,
      isValidJobCustomUrls,
    });
  }

  save = () => {
    const newJobData = {
      description: this.state.jobDescription,
      groups: this.state.jobGroups,
      mml: this.state.jobModelMemoryLimit,
      detectorDescriptions: this.state.jobDetectorDescriptions,
      datafeedQuery: this.state.datafeedQuery,
      datafeedQueryDelay: this.state.datafeedQueryDelay,
      datafeedFrequency: this.state.datafeedFrequency,
      datafeedScrollSize: this.state.datafeedScrollSize,
      customUrls: this.state.jobCustomUrls,
    };

    saveJob(this.state.job, newJobData)
      .then(() => {
        toastNotifications.addSuccess(this.props.intl.formatMessage({
          id: 'xpack.ml.jobsList.editJobFlyout.changesSavedNotificationMessage',
          defaultMessage: 'Changes to {jobId} saved' }, {
          jobId: this.state.job.job_id }
        ));
        this.refreshJobs();
        this.closeFlyout();
      })
      .catch((error) => {
        console.error(error);
        toastNotifications.addDanger(this.props.intl.formatMessage({
          id: 'xpack.ml.jobsList.editJobFlyout.changesNotSavedNotificationMessage',
          defaultMessage: 'Could not save changes to {jobId}' }, {
          jobId: this.state.job.job_id }
        ));
        mlMessageBarService.notify.error(error);
      });
  }

  render() {
    let flyout;

    if (this.state.isFlyoutVisible) {
      const {
        job,
        jobDescription,
        jobGroups,
        jobModelMemoryLimit,
        jobDetectors,
        jobDetectorDescriptions,
        jobBucketSpan,
        jobCustomUrls,
        datafeedQuery,
        datafeedQueryDelay,
        datafeedFrequency,
        datafeedScrollSize,
        jobGroupsValidationError,
        jobModelMemoryLimitValidationError,
        isValidJobDetails,
        isValidJobCustomUrls,
      } = this.state;

      const { intl } = this.props;

      const tabs = [{
        id: 'job-details',
        name: intl.formatMessage({
          id: 'xpack.ml.jobsList.editJobFlyout.jobDetailsTitle',
          defaultMessage: 'Job details'
        }),
        content: <JobDetails
          jobDescription={jobDescription}
          jobGroups={jobGroups}
          jobModelMemoryLimit={jobModelMemoryLimit}
          setJobDetails={this.setJobDetails}
          jobGroupsValidationError={jobGroupsValidationError}
          jobModelMemoryLimitValidationError={jobModelMemoryLimitValidationError}
        />,
      }, {
        id: 'detectors',
        name: intl.formatMessage({
          id: 'xpack.ml.jobsList.editJobFlyout.detectorsTitle',
          defaultMessage: 'Detectors'
        }),
        content: <Detectors
          jobDetectors={jobDetectors}
          jobDetectorDescriptions={jobDetectorDescriptions}
          setDetectorDescriptions={this.setDetectorDescriptions}
        />,
      }, {
        id: 'datafeed',
        name: intl.formatMessage({
          id: 'xpack.ml.jobsList.editJobFlyout.datafeedTitle',
          defaultMessage: 'Datafeed'
        }),
        content: <Datafeed
          datafeedQuery={datafeedQuery}
          datafeedQueryDelay={datafeedQueryDelay}
          datafeedFrequency={datafeedFrequency}
          datafeedScrollSize={datafeedScrollSize}
          jobBucketSpan={jobBucketSpan}
          setDatafeed={this.setDatafeed}
        />,
      }, {
        id: 'custom-urls',
        name: intl.formatMessage({
          id: 'xpack.ml.jobsList.editJobFlyout.customUrlsTitle',
          defaultMessage: 'Custom URLs'
        }),
        content: <CustomUrls
          job={job}
          jobCustomUrls={jobCustomUrls}
          setCustomUrls={this.setCustomUrls}
        />,
      }
      ];

      flyout = (
        <EuiFlyout
          // ownFocus
          onClose={this.closeFlyout}
          size="m"
        >
          <EuiFlyoutHeader>
            <EuiTitle>
              <h2>
                <FormattedMessage
                  id="xpack.ml.jobsList.editJobFlyout.pageTitle"
                  defaultMessage="Edit {jobId}"
                  values={{ jobId: job.id }}
                />
              </h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>

            <EuiTabbedContent
              tabs={tabs}
              initialSelectedTab={tabs[0]}
              onTabClick={() => { }}
            />

          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  iconType="cross"
                  onClick={this.closeFlyout}
                  flush="left"
                >
                  <FormattedMessage
                    id="xpack.ml.jobsList.editJobFlyout.closeButtonLabel"
                    defaultMessage="Close"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  onClick={this.save}
                  fill
                  isDisabled={(isValidJobDetails === false) || (isValidJobCustomUrls === false)}
                >
                  <FormattedMessage
                    id="xpack.ml.jobsList.editJobFlyout.saveButtonLabel"
                    defaultMessage="Save"
                  />
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </EuiFlyout>
      );
    }

    return (
      <div>
        {flyout}
      </div>
    );

  }
}

EditJobFlyoutUI.propTypes = {
  setShowFunction: PropTypes.func.isRequired,
  unsetShowFunction: PropTypes.func.isRequired,
  refreshJobs: PropTypes.func.isRequired,
  allJobIds: PropTypes.array.isRequired,
};

export const EditJobFlyout = injectI18n(EditJobFlyoutUI);
