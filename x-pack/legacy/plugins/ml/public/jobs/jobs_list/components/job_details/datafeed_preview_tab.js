/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import React, { Component } from 'react';

import { EuiSpacer, EuiCallOut, EuiLoadingSpinner } from '@elastic/eui';

import { mlJobService } from 'plugins/ml/services/job_service';
import { checkPermission } from 'plugins/ml/privilege/check_privilege';
import { ML_DATA_PREVIEW_COUNT } from 'plugins/ml/../common/util/job_utils';
import { MLJobEditor } from '../ml_job_editor';
import { FormattedMessage } from '@kbn/i18n/react';

export class DatafeedPreviewPane extends Component {
  constructor(props) {
    super(props);

    this.state = {
      previewJson: '',
      loading: true,
      canPreviewDatafeed: true,
    };
  }

  renderContent() {
    const { previewJson, loading, canPreviewDatafeed } = this.state;

    if (canPreviewDatafeed === false) {
      return (
        <EuiCallOut
          title={
            <FormattedMessage
              id="xpack.ml.jobsList.jobDetails.noPermissionToViewDatafeedPreviewTitle"
              defaultMessage="You do not have permission to view the datafeed preview"
            />
          }
          color="warning"
          iconType="alert"
        >
          <p>
            <FormattedMessage
              id="xpack.ml.jobsList.jobDetails.pleaseContactYourAdministratorLabel"
              defaultMessage="Please contact your administrator"
            />
          </p>
        </EuiCallOut>
      );
    } else if (loading === true) {
      return <EuiLoadingSpinner size="xl" />;
    } else {
      return <MLJobEditor value={previewJson} readOnly={true} />;
    }
  }

  componentDidMount() {
    const canPreviewDatafeed = checkPermission('canPreviewDatafeed');
    this.setState({ canPreviewDatafeed });

    updateDatafeedPreview(this.props.job, canPreviewDatafeed)
      .then(previewJson => {
        this.setState({ previewJson, loading: false });
      })
      .catch(error => {
        console.log('Datafeed preview could not be loaded', error);
        this.setState({ loading: false });
      });
  }

  render() {
    return (
      <React.Fragment>
        <EuiSpacer size="s" />
        {this.renderContent()}
      </React.Fragment>
    );
  }
}
DatafeedPreviewPane.propTypes = {
  job: PropTypes.object.isRequired,
};

function updateDatafeedPreview(job, canPreviewDatafeed) {
  return new Promise((resolve, reject) => {
    if (canPreviewDatafeed) {
      mlJobService
        .getDatafeedPreview(job.job_id)
        .then(resp => {
          if (Array.isArray(resp)) {
            resolve(JSON.stringify(resp.slice(0, ML_DATA_PREVIEW_COUNT), null, 2));
          } else {
            resolve('');
            console.log('Datafeed preview could not be loaded', resp);
          }
        })
        .catch(error => {
          reject(error);
        });
    }
  });
}
