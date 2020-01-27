/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import React, { Component } from 'react';

import { EuiFieldText, EuiForm, EuiFormRow, EuiSpacer } from '@elastic/eui';

import { mlJobService } from '../../../../../services/job_service';
import { detectorToString } from '../../../../../util/string_utils';

export class Detectors extends Component {
  constructor(props) {
    super(props);

    this.detectors = mlJobService.getJobGroups().map(g => ({ label: g.id }));

    this.state = {
      detectors: [],
      detectorDescriptions: [],
    };

    this.setDetectorDescriptions = props.setDetectorDescriptions;
  }

  static getDerivedStateFromProps(props) {
    return {
      detectors: props.jobDetectors,
      detectorDescriptions: props.jobDetectorDescriptions,
    };
  }

  onDescriptionChange = (e, i) => {
    const jobDetectorDescriptions = this.state.detectorDescriptions;
    jobDetectorDescriptions[i] = e.target.value;
    this.setDetectorDescriptions({ jobDetectorDescriptions });
  };

  render() {
    const { detectors, detectorDescriptions } = this.state;
    return (
      <React.Fragment>
        <EuiSpacer size="m" />
        <EuiForm>
          {detectorDescriptions.map((d, i) => (
            <EuiFormRow label={detectorToString(detectors[i])} key={i}>
              <EuiFieldText value={d} onChange={e => this.onDescriptionChange(e, i)} />
            </EuiFormRow>
          ))}
        </EuiForm>
      </React.Fragment>
    );
  }
}
Detectors.propTypes = {
  jobDetectors: PropTypes.array.isRequired,
  jobDetectorDescriptions: PropTypes.array.isRequired,
  setDetectorDescriptions: PropTypes.func.isRequired,
};
