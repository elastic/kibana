/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { MlAppHeader, useAnomalyDetectionJobsBack } from '../../../../../components/ml_app_header';
import { EsqlQueryStep } from './esql_query_step';
import { EsqlTimeRangeStep } from './esql_time_range_step';
import { EsqlWizardProvider } from './esql_wizard_context';

export const Page: FC = () => {
  const anomalyDetectionJobsBack = useAnomalyDetectionJobsBack();

  return (
    <div data-test-subj="mlPageEsqlJob">
      <MlAppHeader
        title={i18n.translate('xpack.ml.esqlJob.pageTitle', {
          defaultMessage: 'ES|QL',
        })}
        back={anomalyDetectionJobsBack}
      />
      <EsqlWizardProvider>
        <EsqlQueryStep />
        <EsqlTimeRangeStep />
      </EsqlWizardProvider>
    </div>
  );
};
