/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { pick } from 'lodash';

import { FormattedMessage } from '@kbn/i18n-react';
import { LogRateAnalysis } from '@kbn/aiops-plugin/public';
import { AIOPS_EMBEDDABLE_ORIGIN } from '@kbn/aiops-common/constants';

import { useDataSource } from '../contexts/ml/data_source_context';
import { useMlKibana } from '../contexts/kibana';
import { HelpMenu } from '../components/help_menu';
import { MlPageHeader } from '../components/page_header';
import { useEnabledFeatures } from '../contexts/ml';

export const LogRateAnalysisPage: FC = () => {
  const { services } = useMlKibana();
  const { showContextualInsights, showNodeInfo } = useEnabledFeatures();

  const { selectedDataView: dataView, selectedSavedSearch: savedSearch } = useDataSource();

  return (
    <>
      <MlPageHeader>
        <FormattedMessage
          id="xpack.ml.logRateAnalysis.pageHeader"
          defaultMessage="Log rate analysis"
        />
      </MlPageHeader>
      {dataView && (
        <LogRateAnalysis
          dataView={dataView}
          savedSearch={savedSearch}
          showContextualInsights={showContextualInsights}
          showFrozenDataTierChoice={showNodeInfo}
          appContextValue={{
            embeddingOrigin: AIOPS_EMBEDDABLE_ORIGIN.ML_AIOPS_LABS,
            ...pick(services, [
              'analytics',
              'application',
              'charts',
              'data',
              'executionContext',
              'fieldFormats',
              'http',
              'i18n',
              'lens',
              'notifications',
              'share',
              'storage',
              'theme',
              'uiActions',
              'uiSettings',
              'unifiedSearch',
              'observabilityAIAssistant',
              'embeddable',
              'cases',
            ]),
          }}
        />
      )}
      <HelpMenu docLink={services.docLinks.links.ml.guide} />
    </>
  );
};
