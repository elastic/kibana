/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { AppNodeType } from '@kbn/custom-app-common';

export type NodeGroup = 'layout' | 'content' | 'data' | 'input';

export interface NodeCatalogEntry {
  type: AppNodeType;
  label: string;
  description: string;
  iconType: string;
  group: NodeGroup;
  /** Whether it can hold other nodes. */
  isContainer: boolean;
}

/**
 * What the editor offers to add, and how it names what it shows. A node type left out of here is
 * still shown and changed, by the generic form, but is not offered to add: the schema and the
 * renderer are all a new type needs, and an entry here is for one that is worth a place in the menu.
 */
const ENTRIES: Partial<Record<AppNodeType, Omit<NodeCatalogEntry, 'type'>>> = {
  stack: {
    label: i18n.translate('xpack.customApp.catalog.stack.label', { defaultMessage: 'Stack' }),
    description: i18n.translate('xpack.customApp.catalog.stack.description', {
      defaultMessage: 'Lays out other components in a column or a row.',
    }),
    iconType: 'layers',
    group: 'layout',
    isContainer: true,
  },
  flyout: {
    label: i18n.translate('xpack.customApp.catalog.flyout.label', { defaultMessage: 'Flyout' }),
    description: i18n.translate('xpack.customApp.catalog.flyout.description', {
      defaultMessage: 'A side panel that an action opens, for details.',
    }),
    iconType: 'menuRight',
    group: 'layout',
    isContainer: true,
  },
  heading: {
    label: i18n.translate('xpack.customApp.catalog.heading.label', { defaultMessage: 'Heading' }),
    description: i18n.translate('xpack.customApp.catalog.heading.description', {
      defaultMessage: 'A title for a section.',
    }),
    iconType: 'textHeading',
    group: 'content',
    isContainer: false,
  },
  text: {
    label: i18n.translate('xpack.customApp.catalog.text.label', { defaultMessage: 'Text' }),
    description: i18n.translate('xpack.customApp.catalog.text.description', {
      defaultMessage: 'A paragraph of text.',
    }),
    iconType: 'text',
    group: 'content',
    isContainer: false,
  },
  callout: {
    label: i18n.translate('xpack.customApp.catalog.callout.label', { defaultMessage: 'Callout' }),
    description: i18n.translate('xpack.customApp.catalog.callout.description', {
      defaultMessage: 'A highlighted message.',
    }),
    iconType: 'info',
    group: 'content',
    isContainer: false,
  },
  stat: {
    label: i18n.translate('xpack.customApp.catalog.stat.label', { defaultMessage: 'Stat' }),
    description: i18n.translate('xpack.customApp.catalog.stat.description', {
      defaultMessage: 'A single number from a query.',
    }),
    iconType: 'number',
    group: 'data',
    isContainer: false,
  },
  chart: {
    label: i18n.translate('xpack.customApp.catalog.chart.label', { defaultMessage: 'Chart' }),
    description: i18n.translate('xpack.customApp.catalog.chart.description', {
      defaultMessage: 'A chart of a query, drawn by Lens from its columns.',
    }),
    iconType: 'visBarVertical',
    group: 'data',
    isContainer: false,
  },
  custom_content: {
    label: i18n.translate('xpack.customApp.catalog.customContent.label', {
      defaultMessage: 'Custom content',
    }),
    description: i18n.translate('xpack.customApp.catalog.customContent.description', {
      defaultMessage: 'Your own HTML layout, filled with the rows of a query.',
    }),
    iconType: 'code',
    group: 'data',
    isContainer: false,
  },
  table: {
    label: i18n.translate('xpack.customApp.catalog.table.label', { defaultMessage: 'Table' }),
    description: i18n.translate('xpack.customApp.catalog.table.description', {
      defaultMessage: 'Rows from a query, with sorting and paging.',
    }),
    iconType: 'visTable',
    group: 'data',
    isContainer: false,
  },
  key_value: {
    label: i18n.translate('xpack.customApp.catalog.keyValue.label', {
      defaultMessage: 'Key-value list',
    }),
    description: i18n.translate('xpack.customApp.catalog.keyValue.description', {
      defaultMessage: 'The rows of a query, each as a list of its fields.',
    }),
    iconType: 'listBullet',
    group: 'data',
    isContainer: false,
  },
  select: {
    label: i18n.translate('xpack.customApp.catalog.select.label', { defaultMessage: 'Select' }),
    description: i18n.translate('xpack.customApp.catalog.select.description', {
      defaultMessage: 'A drop-down that sets a value.',
    }),
    iconType: 'chevronSingleDown',
    group: 'input',
    isContainer: false,
  },
  button_group: {
    label: i18n.translate('xpack.customApp.catalog.buttonGroup.label', {
      defaultMessage: 'Button group',
    }),
    description: i18n.translate('xpack.customApp.catalog.buttonGroup.description', {
      defaultMessage: 'A row of buttons, one of which is chosen.',
    }),
    iconType: 'listCheck',
    group: 'input',
    isContainer: false,
  },
  time_range: {
    label: i18n.translate('xpack.customApp.catalog.timeRange.label', {
      defaultMessage: 'Time range',
    }),
    description: i18n.translate('xpack.customApp.catalog.timeRange.description', {
      defaultMessage: 'Lets people change the period the app shows.',
    }),
    iconType: 'calendar',
    group: 'input',
    isContainer: false,
  },
  button: {
    label: i18n.translate('xpack.customApp.catalog.button.label', { defaultMessage: 'Button' }),
    description: i18n.translate('xpack.customApp.catalog.button.description', {
      defaultMessage: 'Runs a workflow when it is pressed.',
    }),
    iconType: 'play',
    group: 'input',
    isContainer: false,
  },
  link: {
    label: i18n.translate('xpack.customApp.catalog.link.label', { defaultMessage: 'Link' }),
    description: i18n.translate('xpack.customApp.catalog.link.description', {
      defaultMessage: 'A link to Discover, a page of Kibana or another custom app.',
    }),
    iconType: 'link',
    group: 'content',
    isContainer: false,
  },
  form: {
    label: i18n.translate('xpack.customApp.catalog.form.label', { defaultMessage: 'Form' }),
    description: i18n.translate('xpack.customApp.catalog.form.description', {
      defaultMessage: 'Asks a few questions, and runs a workflow with the answers.',
    }),
    iconType: 'editorComment',
    group: 'input',
    isContainer: false,
  },
  list_input: {
    label: i18n.translate('xpack.customApp.catalog.listInput.label', {
      defaultMessage: 'List of values',
    }),
    description: i18n.translate('xpack.customApp.catalog.listInput.description', {
      defaultMessage: 'A box for values to look for, one to a line.',
    }),
    iconType: 'list',
    group: 'input',
    isContainer: false,
  },
  search: {
    label: i18n.translate('xpack.customApp.catalog.search.label', { defaultMessage: 'Search' }),
    description: i18n.translate('xpack.customApp.catalog.search.description', {
      defaultMessage: 'A search box that sets a value as you type.',
    }),
    iconType: 'search',
    group: 'input',
    isContainer: false,
  },
};

export const NODE_CATALOG: readonly NodeCatalogEntry[] = (
  Object.entries(ENTRIES) as Array<[AppNodeType, Omit<NodeCatalogEntry, 'type'>]>
).map(([type, entry]) => ({ type, ...entry }));

/** `custom_content` as words: `Custom content`. */
const nameOf = (type: string): string => {
  const words = type.replace(/_/g, ' ');
  return `${words.charAt(0).toUpperCase()}${words.slice(1)}`;
};

/** How a node is shown: as catalogued, or as what its type is called when it is not. */
export const getCatalogEntry = (type: AppNodeType): NodeCatalogEntry => {
  const entry = ENTRIES[type];
  return entry
    ? { type, ...entry }
    : {
        type,
        label: nameOf(type),
        description: '',
        iconType: 'package',
        group: 'content',
        isContainer: false,
      };
};
