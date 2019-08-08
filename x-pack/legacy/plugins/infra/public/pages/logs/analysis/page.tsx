/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { ColumnarPage } from '../../../components/page';
import { AnalysisPageProviders } from './page_providers';
import { AnalysisResultsContent } from './page_results_content';
import { AnalysisSetupContent } from './page_setup_content';

export const AnalysisPage = () => {
  const isSetupRequired = true;

  return (
    <AnalysisPageProviders>
      <ColumnarPage data-test-subj="infraLogsAnalysisPage">
        {isSetupRequired ? <AnalysisSetupContent /> : <AnalysisResultsContent />}
      </ColumnarPage>
    </AnalysisPageProviders>
  );
};
