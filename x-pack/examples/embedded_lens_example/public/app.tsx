/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiTitle,
} from '@elastic/eui';
import { IndexPattern } from 'src/plugins/data/public';
import { CoreStart } from 'kibana/public';
import { TypedLensByValueInput } from '../../../plugins/lens/public';
import { StartDependencies } from './plugin';

// Generate a Lens state based on some app-specific input parameters.
// `TypedLensByValueInput` can be used for type-safety - it uses the same interfaces as Lens-internal code.
function getLensAttributes(
  defaultIndexPattern: IndexPattern,
  color: string
): TypedLensByValueInput['attributes'] {
  return {
    visualizationType: 'lnsXY',
    title: 'Prefilled from example app',
    references: [
      {
        id: defaultIndexPattern.id!,
        name: 'indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: defaultIndexPattern.id!,
        name: 'indexpattern-datasource-layer-layer1',
        type: 'index-pattern',
      },
    ],
    state: {
      datasourceStates: {
        indexpattern: {
          layers: {
            layer1: {
              columnOrder: ['col1', 'col2'],
              columns: {
                col2: {
                  dataType: 'number',
                  isBucketed: false,
                  label: 'Count of records',
                  operationType: 'count',
                  scale: 'ratio',
                  sourceField: 'Records',
                },
                col1: {
                  dataType: 'date',
                  isBucketed: true,
                  label: '@timestamp',
                  operationType: 'date_histogram',
                  params: { interval: 'auto' },
                  scale: 'interval',
                  sourceField: defaultIndexPattern.timeFieldName!,
                },
              },
            },
          },
        },
      },
      filters: [],
      query: { language: 'kuery', query: '' },
      visualization: {
        axisTitlesVisibilitySettings: { x: true, yLeft: true, yRight: true },
        fittingFunction: 'None',
        gridlinesVisibilitySettings: { x: true, yLeft: true, yRight: true },
        layers: [
          {
            accessors: ['col2'],
            layerId: 'layer1',
            seriesType: 'bar_stacked',
            xAccessor: 'col1',
            yConfig: [{ forAccessor: 'col2', color }],
          },
        ],
        legend: { isVisible: true, position: 'right' },
        preferredSeriesType: 'bar_stacked',
        tickLabelsVisibilitySettings: { x: true, yLeft: true, yRight: true },
        valueLabels: 'hide',
      },
    },
  };
}

export const App = (props: {
  core: CoreStart;
  plugins: StartDependencies;
  defaultIndexPattern: IndexPattern | null;
}) => {
  const [color, setColor] = useState('green');
  const LensComponent = props.plugins.lens.EmbeddableComponent;
  return (
    <EuiPage>
      <EuiPageBody style={{ maxWidth: 1200, margin: '0 auto' }}>
        <EuiPageHeader>
          <EuiPageHeaderSection>
            <EuiTitle size="l">
              <h1>Embedded Lens vis</h1>
            </EuiTitle>
          </EuiPageHeaderSection>
        </EuiPageHeader>
        <EuiPageContent>
          <EuiPageContentBody style={{ maxWidth: 800, margin: '0 auto' }}>
            <p>
              This app embeds a Lens visualization by specifying the configuration. Data fetching
              and rendering is completely managed by Lens itself.
            </p>
            <p>
              The Change color button will update the configuration by picking a new random color of
              the series which causes Lens to re-render. The Edit button will take the current
              configuration and navigate to a prefilled editor.
            </p>
            {props.defaultIndexPattern && props.defaultIndexPattern.isTimeBased() ? (
              <>
                <EuiFlexGroup>
                  <EuiFlexItem grow={false}>
                    <EuiButton
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
                      isDisabled={!props.plugins.lens.canUseEditor()}
                      onClick={() => {
                        props.plugins.lens.navigateToPrefilledEditor({
                          id: '',
                          timeRange: {
                            from: 'now-5d',
                            to: 'now',
                          },
                          attributes: getLensAttributes(props.defaultIndexPattern!, color),
                        });
                        // eslint-disable-next-line no-bitwise
                        const newColor = '#' + ((Math.random() * 0xffffff) << 0).toString(16);
                        setColor(newColor);
                      }}
                    >
                      Edit
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <LensComponent
                  id=""
                  style={{ height: 500 }}
                  timeRange={{
                    from: 'now-5d',
                    to: 'now',
                  }}
                  attributes={getLensAttributes(props.defaultIndexPattern, color)}
                />
              </>
            ) : (
              <p>This demo only works if your default index pattern is set and time based</p>
            )}
          </EuiPageContentBody>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};
