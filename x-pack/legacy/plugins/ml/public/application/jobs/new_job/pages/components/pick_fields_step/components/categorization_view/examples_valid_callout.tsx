/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { EuiCallOut, EuiSpacer, EuiCallOutProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  CategorizationAnalyzer,
  FieldExampleCheck,
} from '../../../../../../../../../common/types/categories';
import { EditCategorizationAnalyzerFlyout } from '../../../common/edit_categorization_analyzer_flyout';
import { CATEGORY_EXAMPLES_VALIDATION_STATUS } from '../../../../../../../../../common/constants/new_job';

interface Props {
  validationChecks: FieldExampleCheck[];
  overallValidStatus: CATEGORY_EXAMPLES_VALIDATION_STATUS;
  categorizationAnalyzer: CategorizationAnalyzer;
}

export const ExamplesValidCallout: FC<Props> = ({
  overallValidStatus,
  validationChecks,
  categorizationAnalyzer,
}) => {
  const analyzerUsed = <AnalyzerUsed categorizationAnalyzer={categorizationAnalyzer} />;

  let color: EuiCallOutProps['color'] = 'success';
  let title = i18n.translate(
    'xpack.ml.newJob.wizard.pickFieldsStep.categorizationFieldCalloutTitle.valid',
    {
      defaultMessage: 'Selected category field is valid',
    }
  );

  if (overallValidStatus === CATEGORY_EXAMPLES_VALIDATION_STATUS.INVALID) {
    color = 'danger';
    title = i18n.translate(
      'xpack.ml.newJob.wizard.pickFieldsStep.categorizationFieldCalloutTitle.invalid',
      {
        defaultMessage: 'Selected category field is invalid',
      }
    );
  } else if (overallValidStatus === CATEGORY_EXAMPLES_VALIDATION_STATUS.PARTIALLY_VALID) {
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
      {validationChecks.map((v, i) => (
        <div key={i}>{v.message}</div>
      ))}
      <EuiSpacer size="s" />
      {analyzerUsed}
    </EuiCallOut>
  );
};

const AnalyzerUsed: FC<{ categorizationAnalyzer: CategorizationAnalyzer }> = ({
  categorizationAnalyzer,
}) => {
  let analyzer = '';

  if (categorizationAnalyzer?.tokenizer !== undefined) {
    analyzer = categorizationAnalyzer.tokenizer;
  } else if (categorizationAnalyzer?.analyzer !== undefined) {
    analyzer = categorizationAnalyzer.analyzer;
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
