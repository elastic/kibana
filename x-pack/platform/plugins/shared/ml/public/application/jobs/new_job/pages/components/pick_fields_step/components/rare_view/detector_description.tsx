/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { FC } from 'react';
import React, { useContext, useEffect, useState } from 'react';
import { EuiCallOut } from '@elastic/eui';

import { JobCreatorContext } from '../../../job_creator_context';
import type { RareJobCreator } from '../../../../../common/job_creator';
import { RARE_DETECTOR_TYPE } from './rare_view';

interface Props {
  detectorType: RARE_DETECTOR_TYPE;
}

export const DetectorDescription: FC<Props> = ({ detectorType }) => {
  const { jobCreator: jc, jobCreatorUpdated } = useContext(JobCreatorContext);
  const jobCreator = jc as RareJobCreator;
  const [description, setDescription] = useState<string | null>(null);

  useEffect(() => {
    const desc = createDetectorDescription(jobCreator, detectorType);
    setDescription(desc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobCreatorUpdated]);

  if (description === null) {
    return null;
  }

  return (
    <EuiCallOut
      title={i18n.translate(
        'xpack.ml.newJob.wizard.pickFieldsStep.rareField.plainText.calloutTitle',
        {
          defaultMessage: 'Job summary',
        }
      )}
    >
      <ul>
        <li>{description}</li>
      </ul>
    </EuiCallOut>
  );
};

function createDetectorDescription(jobCreator: RareJobCreator, detectorType: RARE_DETECTOR_TYPE) {
  if (jobCreator.rareField === null) {
    return null;
  }

  const rareFieldName = jobCreator.rareField.id;
  const populationFieldName = jobCreator.populationField?.id;
  const splitFieldName = jobCreator.splitField?.id;

  const rareSummary = i18n.translate(
    'xpack.ml.newJob.wizard.pickFieldsStep.rareField.plainText.rareSummary',
    {
      defaultMessage: 'Detects rare {rareFieldName} values.',
      values: { rareFieldName },
    }
  );

  const rareSplitSummary = i18n.translate(
    'xpack.ml.newJob.wizard.pickFieldsStep.rareField.plainText.rareSplitSummary',
    {
      defaultMessage: 'For each {splitFieldName}, detects rare {rareFieldName} values.',
      values: { splitFieldName, rareFieldName },
    }
  );

  const freqRarePopulationSummary = i18n.translate(
    'xpack.ml.newJob.wizard.pickFieldsStep.rareField.plainText.freqRarePopulationSummary',
    {
      defaultMessage:
        'Detects {populationFieldName} values that frequently have rare {rareFieldName} values relative to the population.',
      values: { populationFieldName, rareFieldName },
    }
  );

  const freqRareSplitPopulationSummary = i18n.translate(
    'xpack.ml.newJob.wizard.pickFieldsStep.rareField.plainText.freqRareSplitPopulationSummary',
    {
      defaultMessage:
        'For each {splitFieldName}, detects {populationFieldName} values that frequently have rare {rareFieldName} values relative to the population.',
      values: { splitFieldName, populationFieldName, rareFieldName },
    }
  );

  const rarePopulationSummary = i18n.translate(
    'xpack.ml.newJob.wizard.pickFieldsStep.rareField.plainText.rarePopulationSummary',
    {
      defaultMessage:
        'Detects {populationFieldName} values that have rare {rareFieldName} values relative to the population.',
      values: { populationFieldName, rareFieldName },
    }
  );

  const rareSplitPopulationSummary = i18n.translate(
    'xpack.ml.newJob.wizard.pickFieldsStep.rareField.plainText.rareSplitPopulationSummary',
    {
      defaultMessage:
        'For each {splitFieldName}, detects {populationFieldName} values that have rare {rareFieldName} values relative to the population.',
      values: { splitFieldName, populationFieldName, rareFieldName },
    }
  );

  if (detectorType === RARE_DETECTOR_TYPE.RARE) {
    return splitFieldName !== undefined ? rareSplitSummary : rareSummary;
  }

  if (detectorType === RARE_DETECTOR_TYPE.FREQ_RARE_POPULATION) {
    return splitFieldName !== undefined
      ? freqRareSplitPopulationSummary
      : freqRarePopulationSummary;
  }

  if (detectorType === RARE_DETECTOR_TYPE.RARE_POPULATION) {
    return splitFieldName !== undefined ? rareSplitPopulationSummary : rarePopulationSummary;
  }

  return null;
}
