/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';

import { EuiErrorBoundary, EuiSpacer, EuiTab, EuiTabs, EuiTitle, EuiCheckbox } from '@elastic/eui';

import { serializeJob } from '../../../services';

import {
  JobDetails,
  JOB_DETAILS_TAB_SUMMARY,
  JOB_DETAILS_TAB_TERMS,
  JOB_DETAILS_TAB_HISTOGRAM,
  JOB_DETAILS_TAB_METRICS,
  JOB_DETAILS_TAB_JSON,
  tabToHumanizedMap,
} from '../../components';

const JOB_DETAILS_TABS = [
  JOB_DETAILS_TAB_SUMMARY,
  JOB_DETAILS_TAB_TERMS,
  JOB_DETAILS_TAB_HISTOGRAM,
  JOB_DETAILS_TAB_METRICS,
  JOB_DETAILS_TAB_JSON,
];

export class StepReviewUi extends Component {
  static propTypes = {
    fields: PropTypes.object.isRequired,
    job: PropTypes.object.isRequired,
    onFieldsChange: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);

    this.state = {
      selectedTab: JOB_DETAILS_TABS[0],
    };
  }

  selectTab = tab => {
    this.setState({
      selectedTab: tab,
    });
  };

  renderTabs() {
    const { selectedTab } = this.state;
    const { job } = this.props;

    const renderedTabs = [];

    JOB_DETAILS_TABS.forEach((tab, index) => {
      if (tab === JOB_DETAILS_TAB_TERMS && !job.terms.length) {
        return;
      }

      if (tab === JOB_DETAILS_TAB_HISTOGRAM && !job.histogram.length) {
        return;
      }

      if (tab === JOB_DETAILS_TAB_METRICS && !job.metrics.length) {
        return;
      }

      const isSelected = tab === selectedTab;

      renderedTabs.push(
        <EuiTab
          onClick={() => this.selectTab(tab)}
          isSelected={isSelected}
          data-test-subj="stepReviewTab"
          key={index}
        >
          {tabToHumanizedMap[tab]}
        </EuiTab>
      );
    });

    if (!renderedTabs.length === 1) {
      return null;
    }

    return (
      <Fragment>
        <EuiTabs>{renderedTabs}</EuiTabs>
        <EuiSpacer size="m" />
      </Fragment>
    );
  }

  onClickStartAfterCreate = () => {
    const {
      onFieldsChange,
      fields: { startJobAfterCreation },
    } = this.props;

    onFieldsChange({ startJobAfterCreation: !startJobAfterCreation });
  };

  render() {
    const {
      job,
      fields: { startJobAfterCreation },
    } = this.props;
    const { selectedTab } = this.state;
    const json = serializeJob(job);
    return (
      <Fragment>
        <EuiTitle data-test-subj="rollupJobCreateReviewTitle">
          <h3>
            <FormattedMessage
              id="xpack.rollupJobs.create.stepReviewTitle"
              defaultMessage="Review details for '{jobId}'"
              values={{ jobId: job.id }}
            />
          </h3>
        </EuiTitle>

        {this.renderTabs()}

        <EuiErrorBoundary>
          <JobDetails job={job} json={json} tab={selectedTab} />
        </EuiErrorBoundary>

        <EuiSpacer size="m" />

        <EuiCheckbox
          id="rollupJobToggleJobStartAfterCreation"
          data-test-subj="rollupJobToggleJobStartAfterCreation"
          checked={startJobAfterCreation}
          label={
            <span>
              <FormattedMessage
                id="xpack.rollupJobs.create.startJobImmediately"
                defaultMessage="Start job immediately"
              />
            </span>
          }
          onChange={() => this.onClickStartAfterCreate()}
        />
      </Fragment>
    );
  }
}

export const StepReview = injectI18n(StepReviewUi);
