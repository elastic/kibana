/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { SFC } from 'react';

import { i18n } from '@kbn/i18n';

import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

interface StepsNavProps {
  previousActive?: boolean;
  nextActive?: boolean;
  previous?(): void;
  next?(): void;
}

export const WizardNav: SFC<StepsNavProps> = ({
  previous,
  previousActive = true,
  next,
  nextActive = true,
}) => (
  <EuiFlexGroup>
    <EuiFlexItem />
    {previous && (
      <EuiFlexItem grow={false}>
        <EuiButton disabled={!previousActive} onClick={previous} iconType="arrowLeft" size="s">
          {i18n.translate('xpack.ml.dataframe.wizard.previousStepButton', {
            defaultMessage: 'Previous',
          })}
        </EuiButton>
      </EuiFlexItem>
    )}
    {next && (
      <EuiFlexItem grow={false}>
        <EuiButton disabled={!nextActive} onClick={next} iconType="arrowRight" size="s">
          {i18n.translate('xpack.ml.dataframe.wizard.nextStepButton', {
            defaultMessage: 'Next',
          })}
        </EuiButton>
      </EuiFlexItem>
    )}
  </EuiFlexGroup>
);
