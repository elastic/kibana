/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPage,
  EuiPageBody,
  EuiPageSection,
  EuiPageHeader,
  EuiSpacer,
} from '@elastic/eui';

import type { DataView } from '@kbn/data-views-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { LensEmbeddableInput, FormulaPublicApi } from '@kbn/lens-plugin/public';

import { ViewMode } from '@kbn/embeddable-plugin/public';
import { ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import { LensAttributesBuilder, MetricChart, MetricLayer } from '@kbn/lens-embeddable-utils';
import type { StartDependencies } from './plugin';

export const App = (props: {
  core: CoreStart;
  plugins: StartDependencies;
  defaultDataView: DataView;
  formula: FormulaPublicApi;
}) => {
  const [color, setColor] = useState('green');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaveModalVisible, setIsSaveModalVisible] = useState(false);
  const [time, setTime] = useState({
    from: 'now-5d',
    to: 'now',
  });
  const [searchSession, setSearchSession] = useState(() =>
    props.plugins.data.search.session.start()
  );

  const LensComponent = props.plugins.lens.EmbeddableComponent;
  const LensSaveModalComponent = props.plugins.lens.SaveModalComponent;

  const attributes = new LensAttributesBuilder({
    // visualization: new XYChart({
    //   layers: new XYDataLayer({
    //     data: [
    //       {
    //         type: 'formula',
    //         label: 'Count of Records',
    //         value: 'count()',
    //         color,
    //       },
    //     ],
    //     options: {
    //       seriesType: 'bar_stacked',
    //       buckets: { type: 'date_histogram' },
    //     },
    //   }),
    //   dataView: props.defaultDataView,
    //   formulaAPI: props.formula,
    // }),
    visualization: new MetricChart({
      layers: new MetricLayer({
        data: {
          type: 'formula',
          label: 'Count of Records',
          value: 'count()',
          color,
        },
      }),
      dataView: props.defaultDataView,
      formulaAPI: props.formula,
    }),
  }).build();

  return (
    <EuiPage>
      <EuiPageBody style={{ maxWidth: 800, margin: '0 auto' }}>
        <EuiPageHeader paddingSize="s" bottomBorder={true} pageTitle="Embedded Lens vis" />
        <EuiPageSection paddingSize="s">
          <p>
            This app embeds a Lens visualization by specifying the configuration. Data fetching and
            rendering is completely managed by Lens itself.
          </p>
          <p>
            The Change color button will update the configuration by picking a new random color of
            the series which causes Lens to re-render. The Edit button will take the current
            configuration and navigate to a prefilled editor.
          </p>
          <EuiSpacer />
          <EuiFlexGroup wrap gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="lns-example-change-color"
                isLoading={isLoading}
                onClick={() => {
                  // eslint-disable-next-line no-bitwise
                  const newColor = '#' + ((Math.random() * 0xffffff) << 0).toString(16);
                  setColor(newColor);
                }}
              >
                Change color
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                aria-label="Open lens in new tab"
                isDisabled={!props.plugins.lens.canUseEditor()}
                onClick={() => {
                  props.plugins.lens.navigateToPrefilledEditor(
                    {
                      id: '',
                      timeRange: time,
                      attributes,
                    },
                    {
                      openInNewTab: true,
                    }
                  );
                  // eslint-disable-next-line no-bitwise
                  const newColor = '#' + ((Math.random() * 0xffffff) << 0).toString(16);
                  setColor(newColor);
                }}
              >
                Edit in Lens (new tab)
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                aria-label="Open lens in same tab"
                data-test-subj="lns-example-open-editor"
                isDisabled={!props.plugins.lens.canUseEditor()}
                onClick={() => {
                  props.plugins.lens.navigateToPrefilledEditor(
                    {
                      id: '',
                      timeRange: time,
                      attributes,
                    },
                    {
                      openInNewTab: false,
                    }
                  );
                }}
              >
                Edit in Lens (same tab)
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                aria-label="Save visualization into library or embed directly into any dashboard"
                data-test-subj="lns-example-save"
                isDisabled={!attributes}
                onClick={() => {
                  setIsSaveModalVisible(true);
                }}
              >
                Save Visualization
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                aria-label="Change time range"
                data-test-subj="lns-example-change-time-range"
                isDisabled={!attributes}
                onClick={() => {
                  setTime({
                    from: '2015-09-18T06:31:44.000Z',
                    to: '2015-09-23T18:31:44.000Z',
                  });
                }}
              >
                Change time range
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                aria-label="Refresh"
                data-test-subj="lns-example-refresh"
                isDisabled={!attributes}
                onClick={() => {
                  setSearchSession(props.plugins.data.search.session.start());
                }}
              >
                Refresh
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer />
          <LensComponent
            id=""
            withDefaultActions
            style={{ height: 500 }}
            timeRange={time}
            attributes={attributes}
            searchSessionId={searchSession}
            onLoad={(val) => {
              setIsLoading(val);
            }}
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
