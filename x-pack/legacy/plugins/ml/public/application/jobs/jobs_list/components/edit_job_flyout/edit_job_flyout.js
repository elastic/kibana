/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { cloneDeep, isEqual, pick } from 'lodash';
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
  EuiOverlayMask,
  EuiConfirmModal,
} from '@elastic/eui';

import { JobDetails, Detectors, Datafeed, CustomUrls } from './tabs';
import { saveJob } from './edit_utils';
import { loadFullJob } from '../utils';
import { validateModelMemoryLimit, validateGroupNames, isValidCustomUrls } from '../validate_job';
import { mlMessageBarService } from '../../../../components/messagebar';
import { withKibana } from '../../../../../../../../../../src/plugins/kibana_react/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

export class EditJobFlyoutUI extends Component {
  _initialJobFormState = null;

  constructor(props) {
    super(props);

    this.state = {
      job: {},
      hasDatafeed: false,
      isFlyoutVisible: false,
      isConfirmationModalVisible: false,
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

  closeFlyout = (isConfirmed = false) => {
    if (this.containsUnsavedChanges() && !isConfirmed) {
      this.setState({ isConfirmationModalVisible: true });
      return;
    }
    this.setState({ isConfirmationModalVisible: false });
    this.setState({ isFlyoutVisible: false });
  };

  /**
   * Checks if there are any unsaved changes.
   * @returns {boolean}
   */
  containsUnsavedChanges() {
    return !isEqual(
      this._initialJobFormState,
      pick(this.state, [
        'jobDescription',
        'jobGroups',
        'jobModelMemoryLimit',
        'jobCustomUrls',
        'jobDetectors',
        'jobDetectorDescriptions',
        'jobBucketSpan',
        'datafeedQuery',
        'datafeedQueryDelay',
        'datafeedFrequency',
        'datafeedScrollSize',
      ])
    );
  }

  showFlyout = jobLite => {
    const hasDatafeed = jobLite.hasDatafeed;
    loadFullJob(jobLite.id)
      .then(job => {
        this.extractJob(job, hasDatafeed);
        this.setState({
          job,
          isFlyoutVisible: true,
        });
      })
      .catch(error => {
        console.error(error);
      });
  };

  extractInitialJobFormState(job, hasDatafeed) {
    const mml =
      job.analysis_limits && job.analysis_limits.model_memory_limit
        ? job.analysis_limits.model_memory_limit
        : '';
    const detectors =
      job.analysis_config && job.analysis_config.detectors
        ? [...job.analysis_config.detectors]
        : [];

    const bucketSpan = job.analysis_config ? job.analysis_config.bucket_span : '';

    const datafeedConfig = { ...job.datafeed_config };
    const frequency = datafeedConfig.frequency !== undefined ? datafeedConfig.frequency : '';
    const customUrls =
      job.custom_settings && job.custom_settings.custom_urls
        ? [...job.custom_settings.custom_urls]
        : [];

    this._initialJobFormState = Object.freeze({
      jobDescription: job.description,
      jobGroups: job.groups !== undefined ? job.groups : [],
      jobModelMemoryLimit: mml,
      jobDetectors: detectors,
      jobDetectorDescriptions: detectors.map(d => d.detector_description),
      jobBucketSpan: bucketSpan,
      jobCustomUrls: customUrls,
      datafeedQuery: hasDatafeed ? JSON.stringify(datafeedConfig.query, null, 2) : '',
      datafeedQueryDelay: hasDatafeed ? datafeedConfig.query_delay : '',
      datafeedFrequency: hasDatafeed ? frequency : '',
      datafeedScrollSize: hasDatafeed ? +datafeedConfig.scroll_size : null,
    });
  }

  extractJob(job, hasDatafeed) {
    this.extractInitialJobFormState(job, hasDatafeed);

    this.setState({
      job,
      hasDatafeed,
      jobModelMemoryLimitValidationError: '',
      jobGroupsValidationError: '',
      ...cloneDeep(this._initialJobFormState),
    });
  }

  setJobDetails = jobDetails => {
    let { jobModelMemoryLimitValidationError, jobGroupsValidationError } = this.state;

    if (jobDetails.jobModelMemoryLimit !== undefined) {
      jobModelMemoryLimitValidationError = validateModelMemoryLimit(jobDetails.jobModelMemoryLimit)
        .message;
    }

    if (jobDetails.jobGroups !== undefined) {
      if (jobDetails.jobGroups.some(j => this.props.allJobIds.includes(j))) {
        jobGroupsValidationError = i18n.translate(
          'xpack.ml.jobsList.editJobFlyout.groupsAndJobsHasSameIdErrorMessage',
          {
            defaultMessage:
              'A job with this ID already exists. Groups and jobs cannot use the same ID.',
          }
        );
      } else {
        jobGroupsValidationError = validateGroupNames(jobDetails.jobGroups).message;
      }
    }

    const isValidJobDetails =
      jobModelMemoryLimitValidationError === '' && jobGroupsValidationError === '';

    this.setState({
      ...jobDetails,
      jobModelMemoryLimitValidationError,
      jobGroupsValidationError,
      isValidJobDetails,
    });
  };

  setDetectorDescriptions = jobDetectorDescriptions => {
    this.setState({
      ...jobDetectorDescriptions,
    });
  };

  setDatafeed = datafeed => {
    this.setState({
      ...datafeed,
    });
  };

  setCustomUrls = jobCustomUrls => {
    const isValidJobCustomUrls = isValidCustomUrls(jobCustomUrls);
    this.setState({
      jobCustomUrls,
      isValidJobCustomUrls,
    });
  };

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

    const { toasts } = this.props.kibana.services.notifications;
    saveJob(this.state.job, newJobData)
      .then(() => {
        toasts.addSuccess(
          i18n.translate('xpack.ml.jobsList.editJobFlyout.changesSavedNotificationMessage', {
            defaultMessage: 'Changes to {jobId} saved',
            values: {
              jobId: this.state.job.job_id,
            },
          })
        );
        this.refreshJobs();
        this.closeFlyout(true);
      })
      .catch(error => {
        console.error(error);
        toasts.addDanger(
          i18n.translate('xpack.ml.jobsList.editJobFlyout.changesNotSavedNotificationMessage', {
            defaultMessage: 'Could not save changes to {jobId}',
            values: {
              jobId: this.state.job.job_id,
            },
          })
        );
        mlMessageBarService.notify.error(error);
      });
  };

  render() {
    let flyout;
    let confirmationModal;

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

      const tabs = [
        {
          id: 'job-details',
          name: i18n.translate('xpack.ml.jobsList.editJobFlyout.jobDetailsTitle', {
            defaultMessage: 'Job details',
          }),
          content: (
            <JobDetails
              jobDescription={jobDescription}
              jobGroups={jobGroups}
              jobModelMemoryLimit={jobModelMemoryLimit}
              setJobDetails={this.setJobDetails}
              jobGroupsValidationError={jobGroupsValidationError}
              jobModelMemoryLimitValidationError={jobModelMemoryLimitValidationError}
            />
          ),
        },
        {
          id: 'detectors',
          name: i18n.translate('xpack.ml.jobsList.editJobFlyout.detectorsTitle', {
            defaultMessage: 'Detectors',
          }),
          content: (
            <Detectors
              jobDetectors={jobDetectors}
              jobDetectorDescriptions={jobDetectorDescriptions}
              setDetectorDescriptions={this.setDetectorDescriptions}
            />
          ),
        },
        {
          id: 'datafeed',
          name: i18n.translate('xpack.ml.jobsList.editJobFlyout.datafeedTitle', {
            defaultMessage: 'Datafeed',
          }),
          content: (
            <Datafeed
              datafeedQuery={datafeedQuery}
              datafeedQueryDelay={datafeedQueryDelay}
              datafeedFrequency={datafeedFrequency}
              datafeedScrollSize={datafeedScrollSize}
              jobBucketSpan={jobBucketSpan}
              setDatafeed={this.setDatafeed}
            />
          ),
        },
        {
          id: 'custom-urls',
          name: i18n.translate('xpack.ml.jobsList.editJobFlyout.customUrlsTitle', {
            defaultMessage: 'Custom URLs',
          }),
          content: (
            <CustomUrls
              job={job}
              jobCustomUrls={jobCustomUrls}
              setCustomUrls={this.setCustomUrls}
            />
          ),
        },
      ];

      flyout = (
        <EuiFlyout
          onClose={() => {
            this.closeFlyout();
          }}
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
            <EuiTabbedContent tabs={tabs} initialSelectedTab={tabs[0]} onTabClick={() => {}} />
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  iconType="cross"
                  onClick={() => {
                    this.closeFlyout();
                  }}
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
                  isDisabled={isValidJobDetails === false || isValidJobCustomUrls === false}
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

    if (this.state.isConfirmationModalVisible) {
      confirmationModal = (
        <EuiOverlayMask>
          <EuiConfirmModal
            title={
              <FormattedMessage
                id="xpack.ml.jobsList.editJobFlyout.unsavedChangesDialogTitle"
                defaultMessage="Save changes before leaving?"
              />
            }
            onCancel={() => this.closeFlyout(true)}
            onConfirm={() => this.save()}
            cancelButtonText={
              <FormattedMessage
                id="xpack.ml.jobsList.editJobFlyout.leaveAnywayButtonLabel"
                defaultMessage="Leave anyway"
              />
            }
            confirmButtonText={
              <FormattedMessage
                id="xpack.ml.jobsList.editJobFlyout.saveChangesButtonLabel"
                defaultMessage="Save changes"
              />
            }
            defaultFocusedButton="confirm"
          >
            <p>
              <FormattedMessage
                id="xpack.ml.jobsList.editJobFlyout.unsavedChangesDialogMessage"
                defaultMessage="If you don't save, your changes will be lost."
              />
            </p>
          </EuiConfirmModal>
        </EuiOverlayMask>
      );
    }

    {
      return (
        <div>
          {flyout}
          {confirmationModal}
        </div>
      );
    }
  }
}

EditJobFlyoutUI.propTypes = {
  setShowFunction: PropTypes.func.isRequired,
  unsetShowFunction: PropTypes.func.isRequired,
  refreshJobs: PropTypes.func.isRequired,
  allJobIds: PropTypes.array.isRequired,
};

export const EditJobFlyout = withKibana(EditJobFlyoutUI);
