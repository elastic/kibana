/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { distinctUntilChanged, filter, map, switchMap } from 'rxjs/operators';
import { Observable, Subject } from 'rxjs';
import {
  CardinalityModelPlotHigh,
  CardinalityValidationResult,
  ml,
} from '../../../../services/ml_api_service';
import { JobConfigs } from './job_validator';

export enum ValidatorSeverity {
  ERROR = 'ERROR',
  WARNING = 'WARNING',
}

export interface CardinalityValidatorError {
  highCardinality: {
    value: number;
    severity: ValidatorSeverity;
  };
}

export type CardinalityValidatorResult = CardinalityValidatorError | null;

export function isCardinalityModelPlotHigh(
  cardinalityValidationResult: CardinalityValidationResult
): cardinalityValidationResult is CardinalityModelPlotHigh {
  return (
    (cardinalityValidationResult as CardinalityModelPlotHigh).modelPlotCardinality !== undefined
  );
}

export function cardinalityValidator(
  jobConfigs$: Subject<JobConfigs>
): Observable<CardinalityValidatorResult> {
  return jobConfigs$.pipe(
    // Perform a cardinality check only with enabled model plot.
    filter(({ jobCreator }) => {
      return jobCreator?.modelPlot;
    }),
    // No need to perform an API call if the analysis configuration hasn't been changed
    distinctUntilChanged((prev, curr) => {
      return prev.jobConfigString === curr.jobConfigString;
    }),
    switchMap(({ jobCreator }) => {
      return ml.validateCardinality$({
        ...jobCreator.jobConfig,
        datafeed_config: jobCreator.datafeedConfig,
      });
    }),
    map(validationResults => {
      for (const validationResult of validationResults) {
        if (isCardinalityModelPlotHigh(validationResult)) {
          return {
            highCardinality: {
              value: validationResult.modelPlotCardinality,
              severity: ValidatorSeverity.WARNING,
            },
          };
        }
      }
      return null;
    })
  );
}
