/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Router, Routes, Route } from '@kbn/shared-ux-router';
import { render, unmountComponentAtNode } from 'react-dom';
import type {
  ChromeBreadcrumb,
  CoreStart,
  I18nStart,
  ScopedHistory,
  ThemeServiceStart,
} from '@kbn/core/public';
import type { KibanaFeature } from '@kbn/features-plugin/common';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { DataViewEditorStart } from '@kbn/data-view-editor-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { PluginStartContract as AlertingStart } from '@kbn/alerting-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import type { ActionsPublicPluginSetup } from '@kbn/actions-plugin/public';
import { QueryClientProvider } from '@kbn/react-query';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { CloudSetup } from '@kbn/cloud-plugin/public';
import type { FieldsMetadataPublicStart } from '@kbn/fields-metadata-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import { PerformanceContextProvider } from '@kbn/ebt-tools';
import { suspendedComponentWithProps } from './lib/suspended_component_with_props';
import type { ActionTypeRegistryContract, RuleTypeRegistryContract } from '../types';
import { setDataViewsService } from '../common/lib/data_apis';
import { KibanaContextProvider, useKibana } from '../common/lib/kibana';
import { ConnectorProvider } from './context/connector_context';
import { queryClient } from './query_client';
import { RulesPage } from './sections/rules_page/rules_page';

export interface RulesPageServices extends CoreStart {
  actions: ActionsPublicPluginSetup;
  cloud?: CloudSetup;
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  dataViewEditor: DataViewEditorStart;
  charts: ChartsPluginStart;
  alerting?: AlertingStart;
  spaces?: SpacesPluginStart;
  storage?: Storage;
  isCloud: boolean;
  setBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => void;
  actionTypeRegistry: ActionTypeRegistryContract;
  ruleTypeRegistry: RuleTypeRegistryContract;
  history: ScopedHistory;
  kibanaFeatures: KibanaFeature[];
  element: HTMLElement;
  i18n: I18nStart;
  theme: ThemeServiceStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  licensing: LicensingPluginStart;
  expressions: ExpressionsStart;
  isServerless: boolean;
  fieldFormats: FieldFormatsStart;
  lens: LensPublicStart;
  fieldsMetadata: FieldsMetadataPublicStart;
  share?: SharePluginStart;
  contentManagement?: ContentManagementPublicStart;
}

export const renderRulesPageApp = (deps: RulesPageServices) => {
  const { element } = deps;
  render(<RulesPageApp deps={deps} />, element);
  return () => {
    unmountComponentAtNode(element);
  };
};

export const RulesPageApp = ({ deps }: { deps: RulesPageServices }) => {
  const { dataViews } = deps;
  setDataViewsService(dataViews);
  return deps.rendering.addContext(
    <KibanaContextProvider services={{ ...deps }}>
      <Router history={deps.history}>
        <QueryClientProvider client={queryClient}>
          <AppWithoutRouter />
        </QueryClientProvider>
      </Router>
    </KibanaContextProvider>
  );
};

const AppWithoutRouter = () => {
  const {
    actions: { validateEmailAddresses, enabledEmailServices },
    isServerless,
  } = useKibana().services;

  return (
    <ConnectorProvider
      value={{ services: { validateEmailAddresses, enabledEmailServices }, isServerless }}
    >
      <PerformanceContextProvider>
        <Routes>
          <Route path="/*" component={suspendedComponentWithProps(RulesPage, 'xl')} />
        </Routes>
      </PerformanceContextProvider>
    </ConnectorProvider>
  );
};
