/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import React, { Component } from 'react';

import {
  EuiConfirmModal,
  EuiOverlayMask,
  EUI_MODAL_CONFIRM_BUTTON,
  EuiLoadingSpinner,
  EuiSpacer,
} from '@elastic/eui';

import { deleteJobs } from '../utils';
import { DELETING_JOBS_REFRESH_INTERVAL_MS } from '../../../../../common/constants/jobs_list';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';

export const DeleteJobModal = injectI18n(
  class extends Component {
    static displayName = 'DeleteJobModal';
    static propTypes = {
      setShowFunction: PropTypes.func.isRequired,
      unsetShowFunction: PropTypes.func.isRequired,
      refreshJobs: PropTypes.func.isRequired,
    };

    constructor(props) {
      super(props);

      this.state = {
        jobs: [],
        isModalVisible: false,
        deleting: false,
      };

      this.refreshJobs = this.props.refreshJobs;
    }

    componentDidMount() {
      if (typeof this.props.setShowFunction === 'function') {
        this.props.setShowFunction(this.showModal);
      }
    }

    componentWillUnmount() {
      if (typeof this.props.unsetShowFunction === 'function') {
        this.props.unsetShowFunction();
      }
    }

    closeModal = () => {
      this.setState({ isModalVisible: false });
    };

    showModal = jobs => {
      this.setState({
        jobs,
        isModalVisible: true,
        deleting: false,
      });
    };

    deleteJob = () => {
      this.setState({ deleting: true });
      deleteJobs(this.state.jobs);

      setTimeout(() => {
        this.closeModal();
        this.refreshJobs();
      }, DELETING_JOBS_REFRESH_INTERVAL_MS);
    };

    setEL = el => {
      if (el) {
        this.el = el;
      }
    };

    render() {
      const { intl } = this.props;
      let modal;

      if (this.state.isModalVisible) {
        if (this.el && this.state.deleting === true) {
          // work around to disable the modal's buttons if the jobs are being deleted
          this.el.confirmButton.style.display = 'none';
          this.el.cancelButton.textContent = intl.formatMessage({
            id: 'xpack.ml.jobsList.deleteJobModal.closeButtonLabel',
            defaultMessage: 'Close',
          });
        }

        const title = (
          <FormattedMessage
            id="xpack.ml.jobsList.deleteJobModal.deleteJobsTitle"
            defaultMessage="Delete {jobsCount, plural, one {{jobId}} other {# jobs}}"
            values={{
              jobsCount: this.state.jobs.length,
              jobId: this.state.jobs[0].id,
            }}
          />
        );
        modal = (
          <EuiOverlayMask>
            <EuiConfirmModal
              data-test-subj="mlDeleteJobConfirmModal"
              ref={this.setEL}
              title={title}
              onCancel={this.closeModal}
              onConfirm={this.deleteJob}
              cancelButtonText={
                <FormattedMessage
                  id="xpack.ml.jobsList.deleteJobModal.cancelButtonLabel"
                  defaultMessage="Cancel"
                />
              }
              confirmButtonText={
                <FormattedMessage
                  id="xpack.ml.jobsList.deleteJobModal.deleteButtonLabel"
                  defaultMessage="Delete"
                />
              }
              buttonColor="danger"
              defaultFocusedButton={EUI_MODAL_CONFIRM_BUTTON}
              className="eui-textBreakWord"
            >
              {this.state.deleting === true && (
                <div>
                  <FormattedMessage
                    id="xpack.ml.jobsList.deleteJobModal.deletingJobsStatusLabel"
                    defaultMessage="Deleting jobs"
                  />
                  <EuiSpacer />
                  <div style={{ textAlign: 'center' }}>
                    <EuiLoadingSpinner size="l" />
                  </div>
                </div>
              )}

              {this.state.deleting === false && (
                <React.Fragment>
                  <p>
                    <FormattedMessage
                      id="xpack.ml.jobsList.deleteJobModal.deleteJobsDescription"
                      defaultMessage="Are you sure you want to delete {jobsCount, plural, one {this job} other {these jobs}}?"
                      values={{
                        jobsCount: this.state.jobs.length,
                      }}
                    />
                  </p>
                  <p>
                    <FormattedMessage
                      id="xpack.ml.jobsList.deleteJobModal.deleteMultipleJobsDescription"
                      defaultMessage="Deleting {jobsCount, plural, one {a job} other {multiple jobs}} can be time consuming.
                    {jobsCount, plural, one {It} other {They}} will be deleted in the background
                    and may not disappear from the jobs list instantly"
                      values={{
                        jobsCount: this.state.jobs.length,
                      }}
                    />
                  </p>
                </React.Fragment>
              )}
            </EuiConfirmModal>
          </EuiOverlayMask>
        );
      }

      return <div>{modal}</div>;
    }
  }
);
