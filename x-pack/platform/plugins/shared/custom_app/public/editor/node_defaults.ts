/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { AppNode, AppNodeType } from '@kbn/custom-app-common';

/** The query a new data component starts with: it needs no index, so it runs on any cluster. */
export const DEFAULT_QUERY = 'ROW value = 1';

/**
 * What a new custom content component shows: the first row of its query, as a labelled value. It
 * is written with the design tokens the frame provides, so it looks like the rest of the app.
 */
const STARTER_TEMPLATE = `<style>
  body { margin: 0; padding: var(--cc-space-l); box-sizing: border-box; font-family: var(--cc-font-family); }
  .label { font-size: 0.75rem; }
  .value { font-size: 1.5rem; font-weight: 600; }
</style>
{% for row in rows limit: 1 %}
  {% for column in row %}
    <div class="label">{{ column[0] }}</div>
    <div class="value">{{ column[1].value }}</div>
  {% endfor %}
{% endfor %}`;

/** What the editor can offer a new node to connect to. */
export interface DefaultsContext {
  /** The name of the value a new input sets, which the editor declares for it. */
  valueKey: string;
}

const options = () => [
  {
    value: 'option-1',
    label: i18n.translate('xpack.customApp.defaults.option1', { defaultMessage: 'Option 1' }),
  },
  {
    value: 'option-2',
    label: i18n.translate('xpack.customApp.defaults.option2', { defaultMessage: 'Option 2' }),
  },
];

/**
 * A new node with every field filled, with the value a new input sets. Absent for a type that has
 * no starting point, which the editor then does not offer to add.
 */
export const createDefaultNode = (
  type: AppNodeType,
  id: string,
  { valueKey }: DefaultsContext
): AppNode | undefined => {
  const bind = valueKey;

  switch (type) {
    case 'heading':
      return {
        type,
        id,
        text: i18n.translate('xpack.customApp.defaults.heading', { defaultMessage: 'Heading' }),
      };
    case 'text':
      return {
        type,
        id,
        text: i18n.translate('xpack.customApp.defaults.text', { defaultMessage: 'Some text' }),
      };
    case 'callout':
      return {
        type,
        id,
        color: 'primary',
        title: i18n.translate('xpack.customApp.defaults.callout', { defaultMessage: 'Note' }),
      };
    case 'stat':
      return {
        type,
        id,
        query: DEFAULT_QUERY,
        title: i18n.translate('xpack.customApp.defaults.stat', { defaultMessage: 'Stat' }),
      };
    case 'chart':
      return { type, id, query: DEFAULT_QUERY, onClick: [] };
    case 'custom_content':
      return { type, id, query: DEFAULT_QUERY, template: STARTER_TEMPLATE };
    case 'time_range':
      return { type, id };
    case 'button':
      return {
        type,
        id,
        label: i18n.translate('xpack.customApp.defaults.button', { defaultMessage: 'Run' }),
        onClick: [],
      };
    case 'table':
      return { type, id, query: DEFAULT_QUERY, onRowClick: [] };
    case 'key_value':
      return { type, id, query: DEFAULT_QUERY };
    case 'form':
      return {
        type,
        id,
        submitLabel: i18n.translate('xpack.customApp.defaults.formSubmit', {
          defaultMessage: 'Submit',
        }),
        fields: [
          {
            bind,
            kind: 'text',
            label: i18n.translate('xpack.customApp.defaults.formField', {
              defaultMessage: 'Question 1',
            }),
          },
        ],
        onSubmit: [],
      };
    case 'select':
      return {
        type,
        id,
        bind,
        onChange: [],
        options: options(),
        label: i18n.translate('xpack.customApp.defaults.select', { defaultMessage: 'Filter' }),
      };
    case 'button_group':
      return {
        type,
        id,
        bind,
        onChange: [],
        options: options(),
        label: i18n.translate('xpack.customApp.defaults.buttonGroup', {
          defaultMessage: 'View',
        }),
      };
    case 'search':
      return {
        type,
        id,
        bind,
        onChange: [],
        label: i18n.translate('xpack.customApp.defaults.search', { defaultMessage: 'Search' }),
      };
    case 'link':
      return {
        type,
        id,
        label: i18n.translate('xpack.customApp.defaults.link', {
          defaultMessage: 'Open dashboards',
        }),
        to: { type: 'app', app: 'dashboards' },
      };
    case 'list_input':
      return {
        type,
        id,
        bind,
        onChange: [],
        label: i18n.translate('xpack.customApp.defaults.listInput', {
          defaultMessage: 'Values',
        }),
      };
    case 'stack':
      return { type, id, direction: 'vertical', children: [] };
    case 'flyout':
      return {
        type,
        id,
        children: [],
        title: i18n.translate('xpack.customApp.defaults.flyout', { defaultMessage: 'Details' }),
      };
    default:
      return undefined;
  }
};
