/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, ComponentType } from 'react';
import { EuiFlexItem, EuiFlexGroup, EuiEmptyPrompt, EuiForm, IconType } from '@elastic/eui';
import { ComponentStory } from '@storybook/react';

import {
  IconCircle,
  IconTriangle,
  EuiIconAxisBottom,
  EuiIconAxisLeft,
  EuiIconAxisRight,
  EuiIconAxisTop,
  LensIconChartArea,
  LensIconChartAreaPercentage,
  LensIconChartAreaStacked,
  LensIconChartBar,
  LensIconChartBarAnnotations,
  LensIconChartBarHorizontal,
  LensIconChartBarHorizontalPercentage,
  LensIconChartBarHorizontalStacked,
  LensIconChartBarPercentage,
  LensIconChartBarReferenceLine,
  LensIconChartBarStacked,
  LensIconChartDatatable,
  LensIconChartDonut,
  LensIconChartLine,
  LensIconChartMetric,
  LensIconChartMixedXy,
  LensIconChartMosaic,
  LensIconChartPie,
  LensIconChartTreemap,
  LensIconChartWaffle,
  DropIllustration,
  GlobeIllustration,
  EuiIconLegend,
  LensIconRegionMap,
} from '..';

export default {
  title: 'Lens Icons',
  decorators: [(story: Function) => <EuiForm>{story()}</EuiForm>],
};

const IconsArray: Array<{
  title: string;
  Component: ComponentType<{ title: string; titleId: string }>;
}> = [
  {
    title: 'EuiIconAxisBottom',
    Component: EuiIconAxisBottom,
  },
  {
    title: 'EuiIconAxisLeft',
    Component: EuiIconAxisLeft,
  },
  {
    title: 'EuiIconAxisRight',
    Component: EuiIconAxisRight,
  },
  {
    title: 'EuiIconAxisTop',
    Component: EuiIconAxisTop,
  },
  {
    title: 'LensIconChartArea',
    Component: LensIconChartArea,
  },
  {
    title: 'LensIconChartAreaPercentage',
    Component: LensIconChartAreaPercentage,
  },
  {
    title: 'LensIconChartAreaStacked',
    Component: LensIconChartAreaStacked,
  },
  {
    title: 'LensIconChartBar',
    Component: LensIconChartBar,
  },
  {
    title: 'LensIconChartBarAnnotations',
    Component: LensIconChartBarAnnotations,
  },
  {
    title: 'LensIconChartBarHorizontal',
    Component: LensIconChartBarHorizontal,
  },
  {
    title: 'LensIconChartBarHorizontalPercentage',
    Component: LensIconChartBarHorizontalPercentage,
  },
  {
    title: 'LensIconChartBarHorizontalStacked',
    Component: LensIconChartBarHorizontalStacked,
  },
  {
    title: 'LensIconChartBarPercentage',
    Component: LensIconChartBarPercentage,
  },
  {
    title: 'LensIconChartBarReferenceLine',
    Component: LensIconChartBarReferenceLine,
  },
  {
    title: 'LensIconChartBarStacked',
    Component: LensIconChartBarStacked,
  },
  {
    title: 'LensIconChartDatatable',
    Component: LensIconChartDatatable,
  },
  {
    title: 'LensIconChartDonut',
    Component: LensIconChartDonut,
  },
  {
    title: 'LensIconChartLine',
    Component: LensIconChartLine,
  },
  {
    title: 'LensIconChartMetric',
    Component: LensIconChartMetric,
  },
  {
    title: 'LensIconChartMixedXy',
    Component: LensIconChartMixedXy,
  },
  {
    title: 'LensIconChartMosaic',
    Component: LensIconChartMosaic,
  },
  {
    title: 'LensIconChartPie',
    Component: LensIconChartPie,
  },
  {
    title: 'LensIconChartTreemap',
    Component: LensIconChartTreemap,
  },
  {
    title: 'LensIconChartWaffle',
    Component: LensIconChartWaffle,
  },
  {
    title: 'DropIllustration',
    Component: DropIllustration,
  },
  {
    title: 'GlobeIllustration',
    Component: GlobeIllustration,
  },
  {
    title: 'EuiIconLegend',
    Component: EuiIconLegend,
  },
  {
    title: 'IconCircle',
    Component: IconCircle,
  },
  {
    title: 'IconTriangle',
    Component: IconTriangle,
  },
  {
    title: 'LensIconRegionMap',
    Component: LensIconRegionMap,
  },
];

interface RootComponentProps {
  icons: typeof IconsArray;
}

function RootComponent(props: RootComponentProps) {
  return (
    <EuiFlexGroup direction={'row'} responsive={false} wrap={true}>
      {props.icons.map((i) => (
        <EuiFlexItem>
          <EuiEmptyPrompt
            style={{ minWidth: '250px' }}
            hasBorder={true}
            hasShadow={true}
            iconType={i.Component as IconType}
            title={<>{i.title}</>}
            titleSize={'s'}
          />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}

const Template: ComponentStory<FC<RootComponentProps>> = (args) => <RootComponent {...args} />;

export const Default = Template.bind({});

Default.args = {
  icons: IconsArray,
};
