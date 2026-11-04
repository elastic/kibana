/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { AppNode } from '@kbn/custom-app-common';

export interface CapabilityViewProps<Node extends AppNode> {
  node: Node;
  /** The text of a setting with the values of the app put in. */
  text: (value: string) => string;
}

export type View = ComponentType<CapabilityViewProps<AppNode>>;
export type Loader = () => Promise<{ default: View }>;

/** The code that draws each capability, loaded when an app first has one. */
const component = (load: () => Promise<Record<string, unknown>>, name: string) => () =>
  load().then((module) => ({ default: module[name] as unknown as View }));

const CORE_LOADERS: Readonly<Record<string, Loader>> = {
  stack: component(() => import('./stack_view'), 'StackView'),
  flyout: component(() => import('./flyout_view'), 'FlyoutView'),
  card: component(() => import('./card_view'), 'CardView'),
  columns: component(() => import('./columns_view'), 'ColumnsView'),
  section: component(() => import('./sections_view'), 'SectionView'),
  tabs: component(() => import('./sections_view'), 'TabsView'),
  accordion: component(() => import('./sections_view'), 'AccordionView'),
  chart: component(() => import('../components/chart_node'), 'ChartNode'),
  custom_content: component(() => import('../components/custom_content_node'), 'CustomContentNode'),
  table: component(() => import('../components/table_node'), 'TableNode'),
  key_value: component(() => import('../components/key_value_node'), 'KeyValueNode'),
  select: component(() => import('../components/select_node'), 'SelectNode'),
  button_group: component(() => import('../components/button_group_node'), 'ButtonGroupNode'),
  switch: component(() => import('../components/switch_node'), 'SwitchNode'),
  search: component(() => import('../components/search_node'), 'SearchNode'),
  list_input: component(() => import('../components/list_input_node'), 'ListInputNode'),
  button: component(() => import('../components/button_node'), 'ButtonNode'),
  link: component(() => import('../components/link_node'), 'LinkNode'),
  form: component(() => import('../components/form_node'), 'FormNode'),
  time_range: component(() => import('../components/time_range_node'), 'TimeRangeNode'),
  heading: () =>
    import('./heading_view').then(({ HeadingView }) => ({
      default: HeadingView as unknown as View,
    })),
  text: () =>
    import('./text_view').then(({ TextView }) => ({ default: TextView as unknown as View })),
  callout: () =>
    import('./callout_view').then(({ CalloutView }) => ({
      default: CalloutView as unknown as View,
    })),
  metric: () =>
    import('../components/metric_node').then(({ MetricNode }) => ({
      default: MetricNode as unknown as View,
    })),
  progress: () =>
    import('../components/progress_node').then(({ ProgressNode }) => ({
      default: ProgressNode as unknown as View,
    })),
  stat: () =>
    import('../components/stat_node').then(({ StatNode }) => ({
      default: StatNode as unknown as View,
    })),
  badge: () =>
    import('./badge_view').then(({ BadgeView }) => ({ default: BadgeView as unknown as View })),
};

const loaders = new Map<string, Loader>(Object.entries(CORE_LOADERS));
const loaded = new Map<string, LazyExoticComponent<View>>();

/** Says how to draw a capability that another plugin registered. */
export const registerCapabilityView = (type: string, load: Loader): void => {
  loaders.set(type, load);
  loaded.delete(type);
};

export const getCapabilityView = (type: string): LazyExoticComponent<View> | undefined => {
  const load = loaders.get(type);
  if (!load) return undefined;
  if (!loaded.has(type)) loaded.set(type, lazy(load));
  return loaded.get(type);
};
