/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
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

  const [lensConfig, setLensConfig] = useState<LensApiState>({
        type: 'metric',
        title: 'Test Metric',
        description: 'A test metric chart',
        dataset: {
          type: 'index',
          index: 'kibana_sample_data_ecommerce',
          time_field: '@timestamp',
        },
        metric: {
          operation: 'count',
          label: 'Count of documents',
          alignments: {
            labels: 'left',
            value: 'left',
          },
          fit: false,
          empty_as_null: false,
        },
        sampling: 1,
        ignore_global_filters: false,
      });
  const [lensConfigString, setLensConfigString] = useState(JSON.stringify(lensConfig));

  const LensComponent = props.plugins.lens.EmbeddableComponent;
  const LensSaveModalComponent = props.plugins.lens.SaveModalComponent;

  const [attributes, setAttributes] = useState<{
    value?: TypedLensByValueInput['attributes'];
    error?: Error;
    loading: boolean;
  }>({ loading: true });

  useEffect(() => {
    const buildAttributes = async () => {
      try {
        setAttributes({ loading: true });
        const configBuilder = new LensConfigBuilder(props.dataViews, props.formula);
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
        setAttributes({
          value: finalLensState as TypedLensByValueInput['attributes'],
          loading: false,
        });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
        setAttributes({
          error: e as Error,
          loading: false,
        });
        setLensConfig({
          type: 'metric',
          title: 'ERROR IN CONFIG',
          dataset: {
            type: 'esql',
            query: 'from kibana_sample_data_logs | stats totalBytes = sum(bytes)',
          },
          metric: {
            operation: 'value',
            column: 'totalBytes',
            label: 'ERROR IN CONFIG',
            fit: false,
            alignments: {
              value: 'left',
              labels: 'left',
            },
          },
          ignore_global_filters: true,
          sampling: 1,
        });
      }
    };

    buildAttributes();
  }, [lensConfig, props.dataViews, props.formula]);

  if (!attributes.value && !attributes.error && !error && attributes.loading) return <div>Loading...</div>;
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
                    // Helper function to parse JavaScript-like object syntax
                    const parseFlexibleJSON = (str: string) => {
                      try {
                        // First try standard JSON.parse
                        return JSON.parse(str);
                      } catch {
                        // If that fails, try to make it more JSON-compliant
                        let sanitized = str
                          // Replace single quotes with double quotes (but not inside double-quoted strings)
                          .replace(/'/g, '"')
                          // Remove trailing commas before closing brackets/braces
                          .replace(/,(\s*[}\]])/g, '$1')
                          // Add quotes around unquoted property names
                          .replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');
                        
                        return JSON.parse(sanitized);
                      }
                    };

                    const newConfig = parseFlexibleJSON(lensConfigString);
                    setLensConfig(newConfig);
                    setSearchSession(props.plugins.data.search.session.start());
                    setError(null);
                  } catch (e) {
                    console.error(e);
                    
                    //setError(e.message);
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
