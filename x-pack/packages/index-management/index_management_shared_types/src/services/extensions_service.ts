/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FunctionComponent, ReactNode } from 'react';
import type { ApplicationStart } from '@kbn/core-application-browser';
import { EuiBadgeProps } from '@elastic/eui';
import { IndexDetailsTab } from '../home_sections';
import { Index } from '../types';

export interface IndexContent {
  renderContent: (args: {
    index: Index;
    getUrlForApp: ApplicationStart['getUrlForApp'];
  }) => ReturnType<FunctionComponent>;
}

export interface IndexToggle {
  matchIndex: (index: Index) => boolean;
  label: string;
  name: string;
}
export interface IndexBadge {
  matchIndex: (index: Index) => boolean;
  label: string;
  // a parseable search bar filter expression, for example "isFollowerIndex:true"
  filterExpression?: string;
  color: EuiBadgeProps['color'];
}

export interface EmptyListContent {
  renderContent: (args: {
    // the button to open the "create index" modal
    createIndexButton: ReturnType<FunctionComponent>;
  }) => ReturnType<FunctionComponent>;
}

export interface IndicesListColumn {
  fieldName: string;
  label: string;
  order: number;
  render?: (index: Index) => ReactNode;
  // return a value used for sorting (only if the value is different from the original value at index[fieldName])
  sort?: (index: Index) => any;
}

export interface ExtensionsSetup {
  // adds an option to the "manage index" menu
  addAction(action: any): void;
  // adds a banner to the indices list
  addBanner(banner: any): void;
  // adds a filter to the indices list
  addFilter(filter: any): void;
  // adds a badge to the index name
  addBadge(badge: IndexBadge): void;
  // adds a toggle to the indices list
  addToggle(toggle: IndexToggle): void;
  // adds a column to display additional information added via a data enricher
  addColumn(column: IndicesListColumn): void;
  // set the content to render when the indices list is empty
  setEmptyListContent(content: EmptyListContent): void;
  // adds a tab to the index details page
  addIndexDetailsTab(tab: IndexDetailsTab): void;
  // sets content to render instead of the code block on the overview tab of the index page
  setIndexOverviewContent(content: IndexContent): void;
  // sets content to render below the docs link on the mappings tab of the index page
  setIndexMappingsContent(content: IndexContent): void;
}
