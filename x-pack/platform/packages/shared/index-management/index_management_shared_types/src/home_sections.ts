/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent, ReactNode } from 'react';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { EuiBreadcrumb, EuiThemeComputed } from '@elastic/eui';
import type { Index } from './types';

export enum Section {
  Indices = 'indices',
  DataStreams = 'data_streams',
  IndexTemplates = 'templates',
  ComponentTemplates = 'component_templates',
  EnrichPolicies = 'enrich_policies',
}

export enum IndexDetailsSection {
  Overview = 'overview',
  Mappings = 'mappings',
  Settings = 'settings',
  Stats = 'stats',
}

export type IndexDetailsTabId = IndexDetailsSection | string;

export interface IndexDetailsTab {
  // a unique key to identify the tab
  id: IndexDetailsTabId;
  // a text that is displayed on the tab label, usually a Formatted message component
  name: ReactNode;
  /**
   * A function that renders the content of the tab.
   *
   * IMPORTANT: This expects an arrow function that returns JSX, NOT a component passed directly.
   *
   * @example
   * // Correct - arrow function returning JSX:
   * renderTabContent: ({ index, getUrlForApp }) => (
   *   <MyTabComponent index={index} getUrlForApp={getUrlForApp} />
   * )
   *
   * // Wrong - passing a component directly will break if it uses hooks:
   * renderTabContent: MyTabComponent
   */
  renderTabContent: (args: {
    index: Index;
    getUrlForApp: ApplicationStart['getUrlForApp'];
    euiTheme: EuiThemeComputed;
  }) => ReturnType<FunctionComponent>;
  // a number to specify the order of the tabs
  order: number;
  // an optional function to return a boolean for when to render the tab
  // if omitted, the tab is always rendered
  shouldRenderTab?: (args: { index: Index }) => boolean;
  breadcrumb?: EuiBreadcrumb;
}
