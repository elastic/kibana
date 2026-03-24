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
import type { LensEmbeddableInput } from '@kbn/lens-plugin/public';

import type { ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import { LensConfigBuilder } from '@kbn/lens-embeddable-utils/config_builder';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import {
  type LensApiState,
  lensApiStateSchema,
} from '@kbn/lens-embeddable-utils/config_builder/schema';
import type { StartDependencies } from './plugin';

export const App = (props: {
  core: CoreStart;
  plugins: StartDependencies;
  dataViews: DataViewsContract;
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

  const [lensConfig, setLensConfig] = useState<LensApiState>({
    type: 'metric',
    title: 'Total Sales',
    dataset: {
      type: 'esql',
      query: 'from kibana_sample_data_logs | stats totalBytes = sum(bytes)',
    },
    metrics: [
      {
        type: 'primary',
        operation: 'value',
        column: 'totalBytes',
        label: 'Total Bytes Value',
        fit: false,
        alignments: {
          value: 'left',
          labels: 'left',
        },
      },
    ],
    ignore_global_filters: true,
    sampling: 1,
  });
  const [lensConfigString, setLensConfigString] = useState(JSON.stringify(lensConfig));

  const LensComponent = props.plugins.lens.EmbeddableComponent;
  const LensSaveModalComponent = props.plugins.lens.SaveModalComponent;

  const attributes = useAsync(async () => {
    try {
      const configBuilder = new LensConfigBuilder(props.dataViews);
      // eslint-disable-next-line no-console
      console.log('lensConfig', lensConfig);
      const validatedConfig = lensApiStateSchema.validate(lensConfig);
      // eslint-disable-next-line no-console
      console.log('validatedConfig', validatedConfig);
      const lensState = configBuilder.fromAPIFormat(validatedConfig);
      // eslint-disable-next-line no-console
      console.log('lensState', lensState);
      const apiFormat = configBuilder.toAPIFormat(lensState);
      // eslint-disable-next-line no-console
      console.log('apiFormat', apiFormat);
      const finalLensState = configBuilder.fromAPIFormat(apiFormat);
      // eslint-disable-next-line no-console
      console.log('finalLensState', finalLensState);
      return finalLensState as TypedLensByValueInput['attributes'];
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
    }
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
              viewMode={'view'}
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
