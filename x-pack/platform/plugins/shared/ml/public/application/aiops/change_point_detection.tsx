/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { pick } from 'lodash';
import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';
import { ChangePointDetection } from '@kbn/aiops-plugin/public';
import { AIOPS_EMBEDDABLE_ORIGIN } from '@kbn/aiops-common/constants';
import { useFieldStatsTrigger, FieldStatsFlyoutProvider } from '@kbn/ml-field-stats-flyout';
import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { useDataSource } from '../contexts/ml/data_source_context';
import { useMlKibana } from '../contexts/kibana';
import { HelpMenu } from '../components/help_menu';
import { MlPageHeader } from '../components/page_header';
import { PageTitle } from '../components/page_title';
import { TechnicalPreviewBadge } from '../components/technical_preview_badge';
import { useEnabledFeatures } from '../contexts/ml/serverless_context';
import { DataSourcePicker } from '../components/data_source_picker/data_source_picker';

export const ChangePointDetectionPage: FC = () => {
  const { services } = useMlKibana();
  const { showNodeInfo } = useEnabledFeatures();

  const { selectedDataView: dataView, selectedSavedSearch: savedSearch } = useDataSource();

  const pageTitle = (
    <FormattedMessage
      id="xpack.ml.changePointDetection.pageHeader"
      defaultMessage="Change point detection"
    />
  );

  const headerContent = (
    <DataSourcePicker
      currentDataView={dataView ?? null}
      currentSavedSearch={savedSearch ?? null}
      requireTimeBased
    />
  );

  return (
    <>
      <MlPageHeader>
        <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
          <EuiFlexItem grow={false}>
            <PageTitle title={pageTitle} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <TechnicalPreviewBadge />
          </EuiFlexItem>
        </EuiFlexGroup>
      </MlPageHeader>
      {!dataView ? (
        <>
          {headerContent}
          <EuiEmptyPrompt
            title={
              <h2>
                <FormattedMessage
                  id="xpack.ml.changePointDetection.noDataViewTitle"
                  defaultMessage="No data view selected"
                />
              </h2>
            }
            body={
              <p>
                <FormattedMessage
                  id="xpack.ml.changePointDetection.noDataViewBody"
                  defaultMessage="Select a data view or Discover session to get started."
                />
              </p>
            }
          />
        </>
      ) : (
        <ChangePointDetection
          dataView={dataView}
          savedSearch={savedSearch}
          showFrozenDataTierChoice={showNodeInfo}
          headerContent={headerContent}
          appContextValue={{
            embeddingOrigin: AIOPS_EMBEDDABLE_ORIGIN.ML_AIOPS_LABS,
            ...pick(services, [
              'analytics',
              'application',
              'cases',
              'charts',
              'data',
              'embeddable',
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
              'usageCollection',
              'userProfile',
              'cps',
            ]),
            fieldStats: { useFieldStatsTrigger, FieldStatsFlyoutProvider },
          }}
        />
      )}
      <HelpMenu
        docLink={services.docLinks.links.aggs.change_point}
        appName={i18n.translate('xpack.ml.changePointDetection.pageHeader', {
          defaultMessage: 'Change point detection',
        })}
      />
    </>
  );
};
