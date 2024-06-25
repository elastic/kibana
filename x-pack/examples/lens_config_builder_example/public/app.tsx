/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import useAsync from 'react-use/lib/useAsync';
import {
  EuiPage,
  EuiPageBody,
  EuiPageSection,
  EuiPageHeader,
  EuiSpacer,
  EuiTextArea,
  EuiFlexItem,
  EuiButton,
  EuiFlexGroup,
} from '@elastic/eui';

import type { CoreStart } from '@kbn/core/public';
import type { LensEmbeddableInput, FormulaPublicApi } from '@kbn/lens-plugin/public';

import { ViewMode } from '@kbn/embeddable-plugin/public';
import { ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import { LensConfig, LensConfigBuilder } from '@kbn/lens-embeddable-utils/config_builder';
import { DataViewsContract } from '@kbn/data-views-plugin/public';
import { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import type { StartDependencies } from './plugin';

export const App = (props: {
  core: CoreStart;
  plugins: StartDependencies;
  dataViews: DataViewsContract;
  formula: FormulaPublicApi;
}) => {
  const [error, setError] = useState<string | null>(null);
  const [isSaveModalVisible, setIsSaveModalVisible] = useState(false);
  const [time, setTime] = useState({
    from: 'now-5d',
    to: 'now',
  });
  const [searchSession, setSearchSession] = useState(() =>
    props.plugins.data.search.session.start()
  );

  const [lensConfig, setLensConfig] = useState<LensConfig>({
    chartType: 'metric',
    title: 'Total Sales',
    dataset: {
      esql: 'from kibana_sample_data_logs | stats totalBytes = sum(bytes)',
    },
    value: 'totalBytes',
    label: 'Total Bytes Value',
  });
  const [lensConfigString, setLensConfigString] = useState(JSON.stringify(lensConfig));

  const LensComponent = props.plugins.lens.EmbeddableComponent;
  const LensSaveModalComponent = props.plugins.lens.SaveModalComponent;

  const attributes = useAsync(async () => {
    const configBuilder = new LensConfigBuilder(props.dataViews, props.formula);
    return (await configBuilder.build(lensConfig, {
      embeddable: false,
    })) as TypedLensByValueInput['attributes'];
  }, [lensConfig]);

  if (!attributes.value && !attributes.error && !error) return null;

  return (
    <EuiPage>
      <EuiPageBody style={{ maxWidth: 800, margin: '0 auto' }}>
        <EuiPageHeader paddingSize="s" bottomBorder={true} pageTitle="Embedded Lens vis" />
        <EuiPageSection paddingSize="s">
          <p>
            This app embeds a Lens visualization by specifying the configuration. Data fetching and
            rendering is completely managed by Lens itself.
          </p>
          <EuiSpacer />
          <EuiTextArea
            fullWidth
            compressed={true}
            value={lensConfigString}
            onChange={(e) => {
              setLensConfigString(e.target.value);
            }}
          />
          <EuiFlexGroup wrap gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiButton
                aria-label="Refresh"
                data-test-subj="lns-example-refresh"
                onClick={() => {
                  try {
                    const newConfig = JSON.parse(lensConfigString);
                    setLensConfig(newConfig);
                    setSearchSession(props.plugins.data.search.session.start());
                    setError(null);
                  } catch (e) {
                    setError(e.message);
                  }
                }}
              >
                Refresh
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer />
          {error && <div>{error}</div>}
          {attributes.value && (
            <LensComponent
              id=""
              withDefaultActions
              style={{ height: 500 }}
              timeRange={time}
              attributes={attributes.value}
              searchSessionId={searchSession}
              onBrushEnd={({ range }) => {
                setTime({
                  from: new Date(range[0]).toISOString(),
                  to: new Date(range[1]).toISOString(),
                });
              }}
              onFilter={(_data) => {
                // call back event for on filter event
              }}
              onTableRowClick={(_data) => {
                // call back event for on table row click event
              }}
              viewMode={ViewMode.VIEW}
              extraActions={[
                {
                  id: 'testAction',
                  type: 'link',
                  getIconType: () => 'save',
                  async isCompatible(context: ActionExecutionContext<object>): Promise<boolean> {
                    return true;
                  },
                  execute: async (context: ActionExecutionContext<object>) => {
                    alert('I am an extra action');
                    return;
                  },
                  getDisplayName: () => 'Extra action',
                },
              ]}
            />
          )}

          {attributes.error && <div>{JSON.stringify(attributes.error)}</div>}

          {isSaveModalVisible && (
            <LensSaveModalComponent
              initialInput={attributes as unknown as LensEmbeddableInput}
              onSave={() => {}}
              onClose={() => setIsSaveModalVisible(false)}
            />
          )}
        </EuiPageSection>
      </EuiPageBody>
    </EuiPage>
  );
};
