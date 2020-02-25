/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { EuiButton, EuiSpacer, EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface GetStep3Props {
  isSaving: boolean;
  isDisabled: boolean;
  save: () => void;
  error: string | null;
}

export const Step3: React.FC<GetStep3Props> = (props: GetStep3Props) => {
  let errorUi = null;
  if (props.error) {
    errorUi = (
      <Fragment>
        <EuiCallOut
          title={i18n.translate('xpack.monitoring.alerts.configuration.step3.saveError', {
            defaultMessage: 'Unable to save',
          })}
          color="danger"
          iconType="alert"
        >
          <p>{props.error}</p>
        </EuiCallOut>
        <EuiSpacer />
      </Fragment>
    );
  }

  return (
    <Fragment>
      {errorUi}
      <EuiButton isLoading={props.isSaving} isDisabled={props.isDisabled} onClick={props.save}>
        {i18n.translate('xpack.monitoring.alerts.configuration.save', {
          defaultMessage: 'Save',
        })}
      </EuiButton>
    </Fragment>
  );
};
