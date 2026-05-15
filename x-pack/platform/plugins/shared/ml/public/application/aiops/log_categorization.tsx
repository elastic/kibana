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
import { LogCategorization } from '@kbn/aiops-plugin/public';
import { AIOPS_EMBEDDABLE_ORIGIN } from '@kbn/aiops-common/constants';
import { EuiEmptyPrompt } from '@elastic/eui';

import { useDataSource } from '../contexts/ml/data_source_context';
import { useMlKibana } from '../contexts/kibana';
import { useEnabledFeatures } from '../contexts/ml';
import { HelpMenu } from '../components/help_menu';
import { MlPageHeader } from '../components/page_header';
import { PageTitle } from '../components/page_title';
import { MlDataSourcePicker } from '../components/ml_data_source_picker/ml_data_source_picker';

export const LogCategorizationPage: FC = () => {
  const { services } = useMlKibana();
  const { showNodeInfo } = useEnabledFeatures();

  const { selectedDataView: dataView, selectedSavedSearch: savedSearch } = useDataSource();

  const pageTitle = (
    <FormattedMessage
      id="xpack.ml.logCategorization.pageHeader"
      defaultMessage="Log pattern analysis"
    />
  );

  const headerContent = (
    <MlDataSourcePicker
      currentDataView={dataView ?? null}
      currentSavedSearch={savedSearch ?? null}
    />
  );

  return (
    <>
      <MlPageHeader>
        <PageTitle title={pageTitle} />
      </MlPageHeader>
      {!dataView ? (
        <>
          {headerContent}
          <EuiEmptyPrompt
            title={
              <h2>
                <FormattedMessage
                  id="xpack.ml.logCategorization.noDataViewTitle"
                  defaultMessage="No data view selected"
                />
              </h2>
            }
            body={
              <p>
                <FormattedMessage
                  id="xpack.ml.logCategorization.noDataViewBody"
                  defaultMessage="Select a data view or Discover session to get started."
                />
              </p>
            }
          />
        </>
      ) : (
        <LogCategorization
          dataView={dataView}
          savedSearch={savedSearch}
          showFrozenDataTierChoice={showNodeInfo}
          pageTitle={pageTitle}
          headerContent={headerContent}
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
              'userProfile',
              'embeddable',
              'cases',
              'cps',
            ]),
          }}
        />
      )}
      <HelpMenu docLink={services.docLinks.links.ml.guide} />
    </>
  );
};
