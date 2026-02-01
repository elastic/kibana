/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

interface Props {
  hideFeedbackContainer: () => void;
}

export const CancelButton = ({ hideFeedbackContainer }: Props) => {
  const handleCancel = () => {
    hideFeedbackContainer();
  };

  return (
    <EuiButtonEmpty data-test-subj="feedbackFooterCancelButton" onClick={handleCancel}>
      <FormattedMessage id="feedback.footer.cancelButton" defaultMessage="Cancel" />
    </EuiButtonEmpty>
  );
};
