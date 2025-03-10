/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from '@kbn/i18n-react';

import { EuiCallOut, EuiSpacer } from '@elastic/eui';

export function StepError({
  title = (
    <FormattedMessage
      id="xpack.rollupJobs.create.stepErrorTitle"
      defaultMessage="Fix errors before continuing."
    />
  ),
}) {
  return (
    <Fragment>
      <EuiSpacer size="m" />
      <EuiCallOut
        title={title}
        color="danger"
        iconType="cross"
        data-test-subj="rollupJobCreateStepError"
      />
    </Fragment>
  );
}

StepError.propTypes = {
  title: PropTypes.node,
};
