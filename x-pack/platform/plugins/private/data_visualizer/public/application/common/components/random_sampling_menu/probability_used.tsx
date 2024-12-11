/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isDefined } from '@kbn/ml-is-defined';
import { EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import type { Props } from '../document_count_content/document_count_content';

export const ProbabilityUsedMessage = ({
  samplingProbability,
}: Pick<Props, 'samplingProbability'>) => {
  return isDefined(samplingProbability) ? (
    <div data-test-subj="dvRandomSamplerProbabilityUsedMsg">
      <EuiSpacer size="m" />

      <FormattedMessage
        id="xpack.dataVisualizer.randomSamplerSettingsPopUp.probabilityLabel"
        defaultMessage="Probability used: {samplingProbability}%"
        values={{ samplingProbability: samplingProbability * 100 }}
      />
    </div>
  ) : null;
};
