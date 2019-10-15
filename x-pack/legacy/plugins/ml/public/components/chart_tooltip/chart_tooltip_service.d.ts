/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BehaviorSubject } from 'rxjs';

import { TooltipValue, TooltipValueFormatter } from '@elastic/charts';

interface TooltipData {
  name: string;
  value: any;
  color: string;
  isHighlighted: boolean;
  isXValue: boolean;
  seriesKey: string;
  yAccessor: string;
  skipHeader?: boolean;
}

interface ChartTooltipState {
  isTooltipVisible: boolean;
  tooltipData: TooltipData[];
  tooltipHeaderFormatter?: TooltipValueFormatter;
  tooltipPosition: { transform: string };
}

export declare const chartTooltip$: BehaviorSubject<ChartTooltipState>;

interface ToolTipOffset {
  x: number;
  y: number;
}

interface MlChartTooltipService {
  element: HTMLElement | null;
  show: (tooltipData: TooltipData[], target: HTMLElement | null, offset: ToolTipOffset) => void;
  hide: () => void;
}

export declare const mlChartTooltipService: MlChartTooltipService;
