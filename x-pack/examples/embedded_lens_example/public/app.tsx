/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiTitle,
} from '@elastic/eui';
import { CoreStart } from 'kibana/public';
import { LensProps } from '../../../plugins/lens/public';
import { StartDependencies } from './plugin';

function getLensAttributes(defaultIndex: string, color: string): LensProps['attributes'] {
  return {
    visualizationType: 'lnsXY',
    title: '',
    references: [
      {
        id: defaultIndex,
        name: 'indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: defaultIndex,
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
                  sourceField: '@timestamp',
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

export const App = (props: { core: CoreStart; plugins: StartDependencies }) => {
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
            <EuiButton
              onClick={() => {
                // eslint-disable-next-line no-bitwise
                const newColor = '#' + ((Math.random() * 0xffffff) << 0).toString(16);
                setColor(newColor);
              }}
            >
              Change color
            </EuiButton>
            <EuiButton
              onClick={() => {
                props.plugins.lens.navigateToPrefilledEditor({
                  id: '',
                  timeRange: {
                    from: 'now-5d',
                    to: 'now',
                  },
                  attributes: getLensAttributes(props.core.uiSettings.get('defaultIndex'), color),
                });
                // eslint-disable-next-line no-bitwise
                const newColor = '#' + ((Math.random() * 0xffffff) << 0).toString(16);
                setColor(newColor);
              }}
            >
              Edit
            </EuiButton>
            <LensComponent
              id=""
              height={500}
              timeRange={{
                from: 'now-5d',
                to: 'now',
              }}
              attributes={getLensAttributes(props.core.uiSettings.get('defaultIndex'), color)}
            />
          </EuiPageContentBody>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};
