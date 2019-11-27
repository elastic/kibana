/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useContext, useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiCallOut, EuiText } from '@elastic/eui';
import { JobCreatorContext } from '../../../../job_creator_context';
import {
  CardinalityModelPlotHigh,
  CardinalityValidationResult,
  ml,
} from '../../../../../../../../services/ml_api_service';

export function isCardinalityModelPlotHigh(
  cardinalityValidationResult: CardinalityValidationResult
): cardinalityValidationResult is CardinalityModelPlotHigh {
  return (
    (cardinalityValidationResult as CardinalityModelPlotHigh).modelPlotCardinality !== undefined
  );
}

export const MMLCallout: FC = () => {
  const { jobCreator } = useContext(JobCreatorContext);
  const [highCardinality, setHighCardinality] = useState<
    CardinalityModelPlotHigh['modelPlotCardinality'] | null
  >(null);

  const validateCardinality = async () => {
    const validationResults = await ml.validateCardinality({
      ...jobCreator.jobConfig,
      datafeed_config: jobCreator.datafeedConfig,
    });

    for (const validationResult of validationResults) {
      if (isCardinalityModelPlotHigh(validationResult)) {
        setHighCardinality(validationResult.modelPlotCardinality);
        break;
      }
    }
  };

  useEffect(() => {
    if (jobCreator.modelPlot) {
      validateCardinality();
    }
  }, [jobCreator.modelPlot, jobCreator.detectors]);

  return jobCreator.modelPlot === true && highCardinality !== null ? (
    <EuiCallOut
      title={
        <FormattedMessage
          id="xpack.ml.newJob.wizard.jobDetailsStep.advancedSection.mmlWarning.title"
          defaultMessage="Proceed with caution!"
        />
      }
      color="warning"
      iconType="help"
    >
      <EuiText>
        <FormattedMessage
          id="xpack.ml.newJob.wizard.jobDetailsStep.advancedSection.mmlWarning.message"
          defaultMessage="Creating model plots is resource intensive and not recommended
                where the cardinality of the selected fields is greater than 100. Estimated cardinality
                for this job is {highCardinality}.
                If you enable model plot with this configuration we recommend you use a dedicated results index."
          values={{ highCardinality }}
        />
      </EuiText>
    </EuiCallOut>
  ) : null;
};
