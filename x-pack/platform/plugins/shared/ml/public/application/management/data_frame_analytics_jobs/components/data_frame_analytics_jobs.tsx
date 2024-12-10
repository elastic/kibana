/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { CoreStart } from '@kbn/core/public';

import { EuiPageTemplate, EuiSpacer } from '@elastic/eui';

import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { type MlFeatures } from '../../../../../common/constants/app';
import { Page as DataFrameAnalyticsJobsList } from '../../../data_frame_analytics/pages/analytics_management/page';
import { ManagementSectionWrapper } from '../../management_section_wrapper';

interface Props {
  coreStart: CoreStart;
  share: SharePluginStart;
  history: ManagementAppMountParams['history'];
  spacesApi?: SpacesPluginStart;
  data: DataPublicPluginStart;
  charts: ChartsPluginStart;
  usageCollection?: UsageCollectionSetup;
  fieldFormats: FieldFormatsStart;
  isServerless: boolean;
  mlFeatures: MlFeatures;
}

export const DataFrameAnalyticsJobsPage: FC<Props> = ({
  coreStart,
  share,
  history,
  spacesApi,
  data,
  charts,
  usageCollection,
  fieldFormats,
  isServerless,
  mlFeatures,
}) => {
  return (
    <ManagementSectionWrapper
      {...{
        coreStart,
        share,
        history,
        spacesApi,
        data,
        charts,
        usageCollection,
        fieldFormats,
        isServerless,
        mlFeatures,
      }}
    >
      <EuiPageTemplate.Header
        pageTitle={
          <FormattedMessage
            id="xpack.ml.management.overview.dataFrameAnalyticsJobsPageTitle"
            defaultMessage="Data Frame Analytics Jobs"
          />
        }
        description={
          <FormattedMessage
            id="xpack.ml.management.jobsList.jobsListTagline"
            defaultMessage="Identify, analyze, and process your data using advanced analysis techniques."
          />
        }
        // rightSideItems={[<DocsLink currentTabId={currentTabId} />]}
        bottomBorder
        paddingSize={'none'}
      />

      <EuiSpacer size="l" />

      <EuiPageTemplate.Section
        paddingSize={'none'}
        id="kibanaManagementMLSection"
        data-test-subj="mlPageStackManagementJobsList"
      >
        <DataFrameAnalyticsJobsList />
      </EuiPageTemplate.Section>
    </ManagementSectionWrapper>
  );
};
