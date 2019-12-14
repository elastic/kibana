/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import React, { Component } from 'react';

import { EuiSpacer, EuiBasicTable } from '@elastic/eui';

import { formatDate } from '@elastic/eui/lib/services/format';
import { ml } from 'plugins/ml/services/ml_api_service';
import { JobIcon } from '../../../../components/job_message_icon';
import { injectI18n } from '@kbn/i18n/react';

const TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';

class JobMessagesPaneUI extends Component {
  constructor(props) {
    super(props);

    this.state = {
      messages: [],
    };
    this.jobId = props.job.job_id;
  }

  componentDidMount() {
    ml.jobs
      .jobAuditMessages(this.jobId)
      .then(messages => {
        this.setState({ messages });
      })
      .catch(error => {
        console.log('Job messages could not be loaded', error);
      });
  }

  render() {
    const { messages } = this.state;
    const { intl } = this.props;
    const columns = [
      {
        name: '',
        render: item => <JobIcon message={item} />,
      },
      {
        name: intl.formatMessage({
          id: 'xpack.ml.jobsList.jobDetails.messagesPane.timeLabel',
          defaultMessage: 'Time',
        }),
        render: item => formatDate(item.timestamp, TIME_FORMAT),
      },
      {
        field: 'node_name',
        name: intl.formatMessage({
          id: 'xpack.ml.jobsList.jobDetails.messagesPane.nodeLabel',
          defaultMessage: 'Node',
        }),
      },
      {
        field: 'message',
        name: intl.formatMessage({
          id: 'xpack.ml.jobsList.jobDetails.messagesPane.messageLabel',
          defaultMessage: 'Message',
        }),
      },
    ];
    return (
      <React.Fragment>
        <EuiSpacer size="s" />
        <div className="job-messages-table">
          <EuiBasicTable items={messages} columns={columns} />
        </div>
      </React.Fragment>
    );
  }
}
JobMessagesPaneUI.propTypes = {
  job: PropTypes.object.isRequired,
};

export const JobMessagesPane = injectI18n(JobMessagesPaneUI);
