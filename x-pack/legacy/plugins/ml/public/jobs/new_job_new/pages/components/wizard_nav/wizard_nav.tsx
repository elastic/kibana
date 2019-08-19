/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import { FormattedMessage } from '@kbn/i18n/react';

import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

interface StepsNavProps {
  previousActive?: boolean;
  nextActive?: boolean;
  previous?(): void;
  next?(): void;
}

export const WizardNav: FC<StepsNavProps> = ({
  previous,
  previousActive = true,
  next,
  nextActive = true,
}) => (
  <EuiFlexGroup>
    <EuiFlexItem />
    {previous && (
      <EuiFlexItem grow={false}>
        <EuiButton
          disabled={!previousActive}
          onClick={previous}
          iconType="arrowLeft"
          size="s"
          data-test-subj="mlJobWizardNavButtonPrevious"
        >
          <FormattedMessage
            id="xpack.ml.newJob.wizard.previousStepButton"
            defaultMessage="Previous"
          />
        </EuiButton>
      </EuiFlexItem>
    )}
    {next && (
      <EuiFlexItem grow={false}>
        <EuiButton
          disabled={!nextActive}
          onClick={next}
          iconType="arrowRight"
          size="s"
          data-test-subj="mlJobWizardNavButtonNext"
        >
          <FormattedMessage id="xpack.ml.newJob.wizard.nextStepButton" defaultMessage="Next" />
        </EuiButton>
      </EuiFlexItem>
    )}
  </EuiFlexGroup>
);
