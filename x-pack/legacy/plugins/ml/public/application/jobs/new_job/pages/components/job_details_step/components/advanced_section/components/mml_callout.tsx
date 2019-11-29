/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useContext, useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiCallOut, EuiText } from '@elastic/eui';
import { Observable, ReplaySubject, Subject } from 'rxjs';
import { distinctUntilChanged, filter, map, switchMap, takeUntil } from 'rxjs/operators';
import { JobCreatorContext } from '../../../../job_creator_context';
import {
  CardinalityModelPlotHigh,
  CardinalityValidationResult,
  ml,
} from '../../../../../../../../services/ml_api_service';
import { Datafeed, Job } from '../../../../../../common/job_creator/configs';

export function isCardinalityModelPlotHigh(
  cardinalityValidationResult: CardinalityValidationResult
): cardinalityValidationResult is CardinalityModelPlotHigh {
  return (
    (cardinalityValidationResult as CardinalityModelPlotHigh).modelPlotCardinality !== undefined
  );
}

const modelPlotConfig$ = new ReplaySubject<{
  isModelPlotEnabled: boolean;
  jobConfig: Job;
  datafeedConfig: Datafeed;
}>(1);

const modelPlotCardinality$: Observable<number | undefined> = modelPlotConfig$.pipe(
  filter(value => value.isModelPlotEnabled),
  // No need to perform an API call if the detectors haven't been changed
  distinctUntilChanged((prev, curr) => {
    return (
      prev.jobConfig.analysis_config === curr.jobConfig.analysis_config ||
      prev.isModelPlotEnabled === curr.isModelPlotEnabled
    );
  }),
  switchMap(({ jobConfig, datafeedConfig }) => {
    return ml.validateCardinality$({
      ...jobConfig,
      datafeed_config: datafeedConfig,
    });
  }),
  map(validationResults => {
    for (const validationResult of validationResults) {
      if (isCardinalityModelPlotHigh(validationResult)) {
        return validationResult.modelPlotCardinality;
      }
    }
  })
);

export const MMLCallout: FC = () => {
  const { jobCreator } = useContext(JobCreatorContext);
  const [highCardinality, setHighCardinality] = useState<
    CardinalityModelPlotHigh['modelPlotCardinality'] | null
  >(null);

  const unsubscribeAll$ = new Subject();

  useEffect(() => {
    modelPlotCardinality$.pipe(takeUntil(unsubscribeAll$)).subscribe(modelPlotCardinality => {
      setHighCardinality(modelPlotCardinality ?? null);
    });
    return () => {
      unsubscribeAll$.next();
    };
  }, []);

  useEffect(() => {
    modelPlotConfig$.next({
      isModelPlotEnabled: jobCreator.modelPlot,
      jobConfig: jobCreator.jobConfig,
      datafeedConfig: jobCreator.datafeedConfig,
    });
  }, [jobCreator.modelPlot, jobCreator.jobConfig.analysis_config]);

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
