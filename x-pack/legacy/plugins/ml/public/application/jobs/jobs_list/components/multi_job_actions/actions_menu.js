/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { checkPermission } from '../../../../privilege/check_privilege';
import { mlNodesAvailable } from '../../../../ml_nodes_check/check_ml_nodes';
import PropTypes from 'prop-types';
import React, { Component } from 'react';

import { EuiButtonIcon, EuiContextMenuPanel, EuiContextMenuItem, EuiPopover } from '@elastic/eui';

import { closeJobs, stopDatafeeds, isStartable, isStoppable, isClosable } from '../utils';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';

class MultiJobActionsMenuUI extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isOpen: false,
    };

    this.canDeleteJob = checkPermission('canDeleteJob');
    this.canStartStopDatafeed = checkPermission('canStartStopDatafeed') && mlNodesAvailable();
    this.canCloseJob = checkPermission('canCloseJob') && mlNodesAvailable();
  }

  onButtonClick = () => {
    this.setState(prevState => ({
      isOpen: !prevState.isOpen,
    }));
  };

  closePopover = () => {
    this.setState({
      isOpen: false,
    });
  };

  render() {
    const anyJobsDeleting = this.props.jobs.some(j => j.deleting);
    const button = (
      <EuiButtonIcon
        size="s"
        onClick={this.onButtonClick}
        iconType="gear"
        aria-label={this.props.intl.formatMessage({
          id: 'xpack.ml.jobsList.multiJobActionsMenu.managementActionsAriaLabel',
          defaultMessage: 'Management actions',
        })}
        color="text"
        disabled={
          anyJobsDeleting || (this.canDeleteJob === false && this.canStartStopDatafeed === false)
        }
      />
    );

    const items = [
      <EuiContextMenuItem
        key="delete"
        icon="trash"
        disabled={this.canDeleteJob === false}
        onClick={() => {
          this.props.showDeleteJobModal(this.props.jobs);
          this.closePopover();
        }}
      >
        <FormattedMessage
          id="xpack.ml.jobsList.multiJobsActions.deleteJobsLabel"
          defaultMessage="Delete {jobsCount, plural, one {job} other {jobs}}"
          values={{ jobsCount: this.props.jobs.length }}
        />
      </EuiContextMenuItem>,
    ];

    if (isClosable(this.props.jobs)) {
      items.push(
        <EuiContextMenuItem
          key="close job"
          icon="cross"
          disabled={this.canCloseJob === false}
          onClick={() => {
            closeJobs(this.props.jobs);
            this.closePopover();
          }}
        >
          <FormattedMessage
            id="xpack.ml.jobsList.multiJobsActions.closeJobsLabel"
            defaultMessage="Close {jobsCount, plural, one {job} other {jobs}}"
            values={{ jobsCount: this.props.jobs.length }}
          />
        </EuiContextMenuItem>
      );
    }

    if (isStoppable(this.props.jobs)) {
      items.push(
        <EuiContextMenuItem
          key="stop datafeed"
          icon="stop"
          disabled={this.canStartStopDatafeed === false}
          onClick={() => {
            stopDatafeeds(this.props.jobs, this.props.refreshJobs);
            this.closePopover();
          }}
        >
          <FormattedMessage
            id="xpack.ml.jobsList.multiJobsActions.stopDatafeedsLabel"
            defaultMessage="Stop {jobsCount, plural, one {datafeed} other {datafeeds}}"
            values={{ jobsCount: this.props.jobs.length }}
          />
        </EuiContextMenuItem>
      );
    }

    if (isStartable(this.props.jobs)) {
      items.push(
        <EuiContextMenuItem
          key="start datafeed"
          icon="play"
          disabled={this.canStartStopDatafeed === false}
          onClick={() => {
            this.props.showStartDatafeedModal(this.props.jobs);
            this.closePopover();
          }}
        >
          <FormattedMessage
            id="xpack.ml.jobsList.multiJobsActions.startDatafeedsLabel"
            defaultMessage="Start {jobsCount, plural, one {datafeed} other {datafeeds}}"
            values={{ jobsCount: this.props.jobs.length }}
          />
        </EuiContextMenuItem>
      );
    }

    return (
      <EuiPopover
        button={button}
        isOpen={this.state.isOpen}
        closePopover={this.closePopover}
        panelPaddingSize="none"
        anchorPosition="downCenter"
      >
        <EuiContextMenuPanel items={items.reverse()} />
      </EuiPopover>
    );
  }
}
MultiJobActionsMenuUI.propTypes = {
  jobs: PropTypes.array.isRequired,
  showStartDatafeedModal: PropTypes.func.isRequired,
  showDeleteJobModal: PropTypes.func.isRequired,
  refreshJobs: PropTypes.func.isRequired,
};

export const MultiJobActionsMenu = injectI18n(MultiJobActionsMenuUI);
