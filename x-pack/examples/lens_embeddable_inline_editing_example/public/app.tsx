/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPage,
  EuiPageBody,
  EuiPageHeader,
  EuiPageSection,
} from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import { LensConfigBuilder } from '@kbn/lens-embeddable-utils/config_builder/config_builder';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { StartDependencies } from './plugin';
import { DataViewChart } from './dataview_embeddable';

export const App = (props: {
  core: CoreStart;
  plugins: StartDependencies;
  defaultDataView: DataView;
  stateHelpers: Awaited<ReturnType<LensPublicStart['stateHelperApi']>>;
}) => {
  const configBuilder = useMemo(
    () => new LensConfigBuilder(props.stateHelpers.formula, props.plugins.dataViews),
    [props.plugins.dataViews, props.stateHelpers.formula]
  );

  return (
    <KibanaContextProvider
      services={{
        uiSettings: props.core.uiSettings,
        settings: props.core.settings,
        theme: props.core.theme,
      }}
    >
      <EuiPage>
        <EuiPageBody style={{ maxWidth: 1200, margin: '0 auto' }}>
          <EuiPageHeader
            paddingSize="s"
            bottomBorder={true}
            pageTitle="Lens embeddable inline editing"
          />
          <EuiPageSection paddingSize="s">
            <EuiFlexGroup
              className="eui-fullHeight"
              gutterSize="none"
              direction="column"
              responsive={false}
            >
              <EuiFlexItem className="eui-fullHeight">
                <DataViewChart
                  configBuilder={configBuilder}
                  plugins={props.plugins}
                  defaultDataView={props.defaultDataView}
                  isESQL
                />
              </EuiFlexItem>
              <EuiFlexItem className="eui-fullHeight">
                <DataViewChart
                  configBuilder={configBuilder}
                  plugins={props.plugins}
                  defaultDataView={props.defaultDataView}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPageSection>
        </EuiPageBody>
      </EuiPage>
    </KibanaContextProvider>
  );
};
