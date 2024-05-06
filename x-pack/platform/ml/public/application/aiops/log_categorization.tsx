/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { pick } from 'lodash';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { LogCategorization } from '@kbn/aiops-plugin/public';
import { useDataSource } from '../contexts/ml/data_source_context';
import { useMlKibana } from '../contexts/kibana';
import { useEnabledFeatures } from '../contexts/ml';
import { HelpMenu } from '../components/help_menu';
import { TechnicalPreviewBadge } from '../components/technical_preview_badge';
import { MlPageHeader } from '../components/page_header';

export const LogCategorizationPage: FC = () => {
  const { services } = useMlKibana();
  const { showNodeInfo } = useEnabledFeatures();

  const { selectedDataView: dataView, selectedSavedSearch: savedSearch } = useDataSource();

  return (
    <>
      <MlPageHeader>
        <EuiFlexGroup responsive={false} wrap={false} alignItems={'center'} gutterSize={'m'}>
          <EuiFlexItem grow={false}>
            <FormattedMessage
              id="xpack.ml.logCategorization.pageHeader"
              defaultMessage="Log pattern analysis"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <TechnicalPreviewBadge />
          </EuiFlexItem>
        </EuiFlexGroup>
      </MlPageHeader>
      {dataView && (
        <LogCategorization
          dataView={dataView}
          savedSearch={savedSearch}
          showFrozenDataTierChoice={showNodeInfo}
          appDependencies={pick(services, [
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
          ])}
        />
      )}
      <HelpMenu docLink={services.docLinks.links.ml.guide} />
    </>
  );
};
