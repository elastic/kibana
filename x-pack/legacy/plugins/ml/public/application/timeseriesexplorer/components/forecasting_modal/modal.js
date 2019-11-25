/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



/*
 * Renders the modal dialog which allows the user to run and view time series forecasts.
 */

import PropTypes from 'prop-types';
import React from 'react';

import {
  EuiButtonEmpty,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
  EuiSpacer
} from '@elastic/eui';


import { MessageCallOut } from '../../../components/message_call_out';
import { ForecastsList } from './forecasts_list';
import { RunControls } from './run_controls';

import { FormattedMessage } from '@kbn/i18n/react';


export function Modal(props) {
  return (
    <EuiOverlayMask>
      <EuiModal
        onClose={props.close}
        maxWidth={860}
      >

        <EuiModalHeader>
          <EuiModalHeaderTitle>
            <FormattedMessage
              id="xpack.ml.timeSeriesExplorer.forecastingModal.forecastingTitle"
              defaultMessage="Forecasting"
            />
          </EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>

          {props.messages.map(
            (message, i) => (
              <React.Fragment key={i}>
                <MessageCallOut {...message} />
                <EuiSpacer size="m" />
              </React.Fragment>
            )
          )}

          {props.forecasts.length > 0 &&
            <React.Fragment>
              <ForecastsList
                forecasts={props.forecasts}
                viewForecast={props.viewForecast}
              />
              <EuiSpacer/>
            </React.Fragment>
          }
          <RunControls {...props}/>
        </EuiModalBody>

        <EuiModalFooter>
          <EuiButtonEmpty
            onClick={props.close}
            size="s"
            data-test-subj="mlModalForecastButtonClose"
          >
            <FormattedMessage
              id="xpack.ml.timeSeriesExplorer.forecastingModal.closeButtonLabel"
              defaultMessage="Close"
            />
          </EuiButtonEmpty>
        </EuiModalFooter>
      </EuiModal>
    </EuiOverlayMask>
  );
}

Modal.propType = {
  job: PropTypes.object,
  forecasts: PropTypes.array,
  close: PropTypes.func.isRequired,
  viewForecast: PropTypes.func.isRequired,
  runForecast: PropTypes.func.isRequired,
  newForecastDuration: PropTypes.string,
  isNewForecastDurationValid: PropTypes.bool,
  newForecastDurationErrors: PropTypes.array,
  onNewForecastDurationChange: PropTypes.func.isRequired,
  isForecastRequested: PropTypes.bool,
  forecastProgress: PropTypes.number,
  jobOpeningState: PropTypes.number,
  jobClosingState: PropTypes.number,
  messages: PropTypes.array,
};
