/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { AppNode } from '@kbn/custom-app-common';
import { getCapabilityViewLoader } from '@kbn/custom-app-registry';
import { withHostProps, type HostView } from './register_capability';

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
  stack: component(() => import('./stack/view'), 'StackView'),
  flyout: component(() => import('./flyout/view'), 'FlyoutView'),
  card: component(() => import('./card/view'), 'CardView'),
  columns: component(() => import('./columns/view'), 'ColumnsView'),
  section: component(() => import('./section/view'), 'SectionView'),
  tabs: component(() => import('./tabs/view'), 'TabsView'),
  accordion: component(() => import('./accordion/view'), 'AccordionView'),
  table: component(() => import('./table/view'), 'TableNode'),
  key_value: component(() => import('./key_value/view'), 'KeyValueNode'),
  select: component(() => import('./select/view'), 'SelectNode'),
  button_group: component(() => import('./button_group/view'), 'ButtonGroupNode'),
  switch: component(() => import('./switch/view'), 'SwitchNode'),
  search: component(() => import('./search/view'), 'SearchNode'),
  list_input: component(() => import('./list_input/view'), 'ListInputNode'),
  button: component(() => import('./button/view'), 'ButtonNode'),
  link: component(() => import('./link/view'), 'LinkNode'),
  form: component(() => import('./form/view'), 'FormNode'),
  time_range: component(() => import('./time_range/view'), 'TimeRangeNode'),
  heading: () =>
    import('./heading/view').then(({ HeadingView }) => ({
      default: HeadingView as unknown as View,
    })),
  text: () =>
    import('./text/view').then(({ TextView }) => ({
      default: TextView as unknown as View,
    })),
  callout: () =>
    import('./callout/view').then(({ CalloutView }) => ({
      default: CalloutView as unknown as View,
    })),
  metric: () =>
    import('./metric/view').then(({ MetricNode }) => ({
      default: MetricNode as unknown as View,
    })),
  progress: () =>
    import('./progress/view').then(({ ProgressNode }) => ({
      default: ProgressNode as unknown as View,
    })),
  stat: () =>
    import('./stat/view').then(({ StatNode }) => ({
      default: StatNode as unknown as View,
    })),
  badge: () =>
    import('./badge/view').then(({ BadgeView }) => ({
      default: BadgeView as unknown as View,
    })),
};

const loaded = new Map<string, LazyExoticComponent<View>>();

/**
 * The code that draws a capability. The built-in ones are known here; any other was registered by
 * a plugin, with the registry, and is given what it needs from the app.
 */
export const getCapabilityView = (type: string): LazyExoticComponent<View> | undefined => {
  const cached = loaded.get(type);
  if (cached) return cached;

  const core = CORE_LOADERS[type];
  const registered = getCapabilityViewLoader(type);
  const load: Loader | undefined =
    core ??
    (registered &&
      (async () => {
        const { default: view } = await registered();
        return { default: withHostProps(view as HostView) };
      }));
  if (!load) return undefined;

  const view = lazy(load);
  loaded.set(type, view);
  return view;
};
