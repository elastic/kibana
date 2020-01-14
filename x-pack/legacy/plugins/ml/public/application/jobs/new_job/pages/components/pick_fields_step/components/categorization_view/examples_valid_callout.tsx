/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { EuiCallOut, EuiSpacer, EuiCallOutProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { CategorizationAnalyzer } from '../../../../../../../services/ml_server_info';
import { EditCategorizationAnalyzerFlyout } from '../../../common/edit_categorization_analyzer_flyout';
import {
  CATEGORY_EXAMPLES_ERROR_LIMIT,
  CATEGORY_EXAMPLES_WARNING_LIMIT,
} from '../../../../../../../../../common/constants/new_job';

type CategorizationAnalyzerType = CategorizationAnalyzer | null;

interface Props {
  examplesValid: number;
  sampleSize: number;
  categorizationAnalyzer: CategorizationAnalyzerType;
}

export const ExamplesValidCallout: FC<Props> = ({
  examplesValid,
  categorizationAnalyzer,
  sampleSize,
}) => {
  const percentageText = <PercentageText examplesValid={examplesValid} sampleSize={sampleSize} />;
  const analyzerUsed = <AnalyzerUsed categorizationAnalyzer={categorizationAnalyzer} />;

  let color: EuiCallOutProps['color'] = 'success';
  let title = i18n.translate(
    'xpack.ml.newJob.wizard.pickFieldsStep.categorizationFieldCalloutTitle.valid',
    {
      defaultMessage: 'Selected category field is valid',
    }
  );

  if (examplesValid < CATEGORY_EXAMPLES_ERROR_LIMIT) {
    color = 'danger';
    title = i18n.translate(
      'xpack.ml.newJob.wizard.pickFieldsStep.categorizationFieldCalloutTitle.invalid',
      {
        defaultMessage: 'Selected category field is invalid',
      }
    );
  } else if (examplesValid < CATEGORY_EXAMPLES_WARNING_LIMIT) {
    color = 'warning';
    title = i18n.translate(
      'xpack.ml.newJob.wizard.pickFieldsStep.categorizationFieldCalloutTitle.possiblyInvalid',
      {
        defaultMessage: 'Selected category field is possibly invalid',
      }
    );
  }

  return (
    <EuiCallOut color={color} title={title}>
      {percentageText}
      <EuiSpacer size="s" />
      {analyzerUsed}
    </EuiCallOut>
  );
};

const PercentageText: FC<{ examplesValid: number; sampleSize: number }> = ({
  examplesValid,
  sampleSize,
}) => (
  <div>
    <FormattedMessage
      id="xpack.ml.newJob.wizard.pickFieldsStep.categorizationFieldPercentage"
      defaultMessage="{number} field {number, plural, zero {value} one {value} other {values}} analyzed, {percentage}% contain valid tokens."
      values={{
        number: sampleSize,
        percentage: Math.floor(examplesValid * 100),
      }}
    />
  </div>
);

const AnalyzerUsed: FC<{ categorizationAnalyzer: CategorizationAnalyzerType }> = ({
  categorizationAnalyzer,
}) => {
  let analyzer = '';
  if (typeof categorizationAnalyzer === null) {
    return null;
  }

  if (typeof categorizationAnalyzer === 'string') {
    analyzer = categorizationAnalyzer;
  } else {
    if (categorizationAnalyzer?.tokenizer !== undefined) {
      analyzer = categorizationAnalyzer?.tokenizer!;
    } else if (categorizationAnalyzer?.analyzer !== undefined) {
      analyzer = categorizationAnalyzer?.analyzer!;
    }
  }

  return (
    <>
      <div>
        <FormattedMessage
          id="xpack.ml.newJob.wizard.pickFieldsStep.categorizationFieldAnalyzer"
          defaultMessage="Analyzer used: {analyzer}"
          values={{ analyzer }}
        />
      </div>
      <div>
        <EditCategorizationAnalyzerFlyout />
      </div>
    </>
  );
};
