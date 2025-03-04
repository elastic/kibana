/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { $Values } from '@kbn/utility-types';
import type { ColorMapping, PaletteOutput } from '@kbn/coloring';
import type {
  LegendConfig,
  AxisExtentConfig,
  XYCurveType,
  FittingFunction,
  EndValue,
  YScaleType,
  XScaleType,
  LineStyle,
  IconPosition,
  FillStyle,
  YAxisConfig,
} from '@kbn/expression-xy-plugin/common';
import { EventAnnotationConfig, EventAnnotationGroupConfig } from '@kbn/event-annotation-common';
import {
  IconChartArea,
  IconChartLine,
  IconChartAreaStacked,
  IconChartBarHorizontalStacked,
  IconChartBarHorizontalPercentage,
  IconChartAreaPercentage,
  IconChartBar,
  IconChartBarStacked,
  IconChartBarPercentage,
  IconChartBarHorizontal,
} from '@kbn/chart-icons';
import type { AxesSettingsConfig } from '@kbn/visualizations-plugin/common';

import { CollapseFunction } from '../../../common/expressions';
import type { VisualizationType } from '../../types';
import type { ValueLabelConfig } from '../../../common/types';

export const YAxisModes = {
  AUTO: 'auto',
  LEFT: 'left',
  RIGHT: 'right',
  BOTTOM: 'bottom',
} as const;

export const SeriesTypes = {
  BAR: 'bar',
  LINE: 'line',
  AREA: 'area',
  BAR_STACKED: 'bar_stacked',
  AREA_STACKED: 'area_stacked',
  BAR_HORIZONTAL: 'bar_horizontal',
  BAR_PERCENTAGE_STACKED: 'bar_percentage_stacked',
  BAR_HORIZONTAL_STACKED: 'bar_horizontal_stacked',
  AREA_PERCENTAGE_STACKED: 'area_percentage_stacked',
  BAR_HORIZONTAL_PERCENTAGE_STACKED: 'bar_horizontal_percentage_stacked',
} as const;

export const defaultSeriesType = SeriesTypes.BAR_STACKED;

export type YAxisMode = $Values<typeof YAxisModes>;
export type SeriesType = $Values<typeof SeriesTypes>;

export interface AxisConfig extends Omit<YAxisConfig, 'extent'> {
  extent?: AxisExtentConfig;
}

export interface LabelsOrientationConfig {
  x: number;
  yLeft: number;
  yRight: number;
}

export interface YConfig {
  forAccessor: string;
  color?: string;
  icon?: string;
  lineWidth?: number;
  lineStyle?: Exclude<LineStyle, 'dot-dashed'>;
  fill?: FillStyle;
  iconPosition?: IconPosition;
  textVisibility?: boolean;
  axisMode?: YAxisMode;
}

export interface XYDataLayerConfig {
  layerId: string;
  accessors: string[];
  layerType: 'data';
  seriesType: SeriesType;
  xAccessor?: string;
  simpleView?: boolean;
  yConfig?: YConfig[];
  splitAccessor?: string;
  palette?: PaletteOutput;
  collapseFn?: CollapseFunction;
  xScaleType?: XScaleType;
  isHistogram?: boolean;
  columnToLabel?: string;
  colorMapping?: ColorMapping.Config;
}

export interface XYReferenceLineLayerConfig {
  layerId: string;
  accessors: string[];
  yConfig?: YConfig[];
  layerType: 'referenceLine';
}

export interface XYByValueAnnotationLayerConfig {
  layerId: string;
  layerType: 'annotations';
  annotations: EventAnnotationConfig[];
  indexPatternId: string;
  ignoreGlobalFilters: boolean;
  // populated only when the annotation has been forked from the
  // version saved in the library (persisted as XYPersistedLinkedByValueAnnotationLayerConfig)
  cachedMetadata?: {
    title: string;
    description: string;
    tags: string[];
  };
}

export type XYByReferenceAnnotationLayerConfig = XYByValueAnnotationLayerConfig & {
  annotationGroupId: string;
  __lastSaved: EventAnnotationGroupConfig;
};

export type XYAnnotationLayerConfig =
  | XYByReferenceAnnotationLayerConfig
  | XYByValueAnnotationLayerConfig;

export type XYLayerConfig =
  | XYDataLayerConfig
  | XYReferenceLineLayerConfig
  | XYAnnotationLayerConfig;

export interface ValidXYDataLayerConfig extends XYDataLayerConfig {
  xAccessor: NonNullable<XYDataLayerConfig['xAccessor']>;
  layerId: string;
}

export type ValidLayer = ValidXYDataLayerConfig | XYReferenceLineLayerConfig;

// Persisted parts of the state
export interface XYState {
  preferredSeriesType: SeriesType;
  legend: LegendConfig;
  valueLabels?: ValueLabelConfig;
  fittingFunction?: FittingFunction;
  emphasizeFitting?: boolean;
  endValue?: EndValue;
  xExtent?: AxisExtentConfig;
  yLeftExtent?: AxisExtentConfig;
  yRightExtent?: AxisExtentConfig;
  layers: XYLayerConfig[];
  xTitle?: string;
  yTitle?: string;
  yRightTitle?: string;
  yLeftScale?: YScaleType;
  yRightScale?: YScaleType;
  axisTitlesVisibilitySettings?: AxesSettingsConfig;
  tickLabelsVisibilitySettings?: AxesSettingsConfig;
  gridlinesVisibilitySettings?: AxesSettingsConfig;
  labelsOrientation?: LabelsOrientationConfig;
  curveType?: XYCurveType;
  fillOpacity?: number;
  minBarHeight?: number;
  hideEndzones?: boolean;
  showCurrentTimeMarker?: boolean;
}

export type State = XYState;

const barShared = {
  sortPriority: 1,
  description: i18n.translate('xpack.lens.bar.visualizationDescription', {
    defaultMessage: 'Compare categories or groups of data with bars.',
  }),
};

const areaShared = {
  sortPriority: 3,
  description: i18n.translate('xpack.lens.area.visualizationDescription', {
    defaultMessage: 'Compare distributions of cumulative data trends.',
  }),
};

const lineShared = {
  id: 'line',
  icon: IconChartLine,
  label: i18n.translate('xpack.lens.xyVisualization.lineLabel', {
    defaultMessage: 'Line',
  }),
  sortPriority: 2,
  description: i18n.translate('xpack.lens.line.visualizationDescription', {
    defaultMessage: 'Reveal variations in data over time.',
  }),
};

export const visualizationSubtypes: VisualizationType[] = [
  {
    id: 'bar',
    icon: IconChartBar,
    label: i18n.translate('xpack.lens.xyVisualization.barLabel', {
      defaultMessage: 'Bar vertical',
    }),
    ...barShared,
  },
  {
    id: 'bar_horizontal',
    icon: IconChartBarHorizontal,
    label: i18n.translate('xpack.lens.xyVisualization.barHorizontalLabel', {
      defaultMessage: 'H. Bar',
    }),
    fullLabel: i18n.translate('xpack.lens.xyVisualization.barHorizontalFullLabel', {
      defaultMessage: 'Bar horizontal',
    }),
    ...barShared,
  },
  {
    id: 'bar_stacked',
    icon: IconChartBarStacked,
    label: i18n.translate('xpack.lens.xyVisualization.stackedBarLabel', {
      defaultMessage: 'Bar vertical stacked',
    }),
    ...barShared,
  },
  {
    id: 'bar_percentage_stacked',
    icon: IconChartBarPercentage,
    label: i18n.translate('xpack.lens.xyVisualization.stackedPercentageBarLabel', {
      defaultMessage: 'Bar vertical percentage',
    }),
    ...barShared,
  },
  {
    id: 'bar_horizontal_stacked',
    icon: IconChartBarHorizontalStacked,
    label: i18n.translate('xpack.lens.xyVisualization.stackedBarHorizontalLabel', {
      defaultMessage: 'H. Stacked bar',
    }),
    fullLabel: i18n.translate('xpack.lens.xyVisualization.stackedBarHorizontalFullLabel', {
      defaultMessage: 'Bar horizontal stacked',
    }),
    ...barShared,
  },
  {
    id: 'bar_horizontal_percentage_stacked',
    icon: IconChartBarHorizontalPercentage,
    label: i18n.translate('xpack.lens.xyVisualization.stackedPercentageBarHorizontalLabel', {
      defaultMessage: 'H. Percentage bar',
    }),
    fullLabel: i18n.translate(
      'xpack.lens.xyVisualization.stackedPercentageBarHorizontalFullLabel',
      {
        defaultMessage: 'Bar horizontal percentage',
      }
    ),
    ...barShared,
  },
  {
    id: 'area',
    icon: IconChartArea,
    label: i18n.translate('xpack.lens.xyVisualization.areaLabel', {
      defaultMessage: 'Area',
    }),
    ...areaShared,
  },
  {
    id: 'area_stacked',
    icon: IconChartAreaStacked,
    label: i18n.translate('xpack.lens.xyVisualization.stackedAreaLabel', {
      defaultMessage: 'Area stacked',
    }),
    ...areaShared,
  },
  {
    id: 'area_percentage_stacked',
    icon: IconChartAreaPercentage,
    label: i18n.translate('xpack.lens.xyVisualization.stackedPercentageAreaLabel', {
      defaultMessage: 'Area percentage',
    }),
    ...areaShared,
  },
  lineShared,
];

export const visualizationTypes: VisualizationType[] = [
  {
    id: 'bar',
    subtypes: [
      'bar',
      'bar_stacked',
      'bar_percentage_stacked',
      'bar_horizontal',
      'bar_horizontal_stacked',
      'bar_horizontal_percentage_stacked',
    ],
    icon: IconChartBar,
    label: i18n.translate('xpack.lens.xyVisualization.barLabel', {
      defaultMessage: 'Bar',
    }),
    ...barShared,
    getCompatibleSubtype: (seriesType?: string) => {
      if (seriesType === 'area') {
        return 'bar';
      } else if (seriesType === 'area_stacked') {
        return 'bar_stacked';
      } else if (seriesType === 'area_percentage_stacked') {
        return 'bar_percentage_stacked';
      }
    },
  },
  {
    id: 'area',
    icon: IconChartArea,
    label: i18n.translate('xpack.lens.xyVisualization.areaLabel', {
      defaultMessage: 'Area',
    }),
    sortPriority: 3,
    description: i18n.translate('xpack.lens.area.visualizationDescription', {
      defaultMessage: 'Compare distributions of cumulative data trends.',
    }),
    subtypes: ['area', 'area_stacked', 'area_percentage_stacked'],
    getCompatibleSubtype: (seriesType?: string) => {
      if (seriesType === 'bar') {
        return 'area';
      } else if (seriesType === 'bar_stacked') {
        return 'area_stacked';
      } else if (seriesType === 'bar_percentage_stacked') {
        return 'area_percentage_stacked';
      }
    },
  },
  {
    ...lineShared,
    subtypes: ['line'],
  },
];
