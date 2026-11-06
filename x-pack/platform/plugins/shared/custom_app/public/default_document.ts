/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { stateRef, type AppDocument } from '@kbn/custom-app-common';

// Temporary demo data that needs no index, so a new panel works on any cluster. Replaced by
// templates once the start flow exists.
const SERVICES = `ROW data = ["checkout:12", "cart:3", "search:27", "payments:5"]
| MV_EXPAND data
| DISSECT data "%{service}:%{errors}"
| EVAL errors = TO_INTEGER(errors)`;

export const SERVICES_QUERY = `${SERVICES}
| WHERE CONTAINS(service, ?nameFilter) AND errors >= TO_INTEGER(?minErrors)
| KEEP service, errors
| SORT errors DESC`;

export const SERVICE_DETAIL_QUERY = `${SERVICES}
| WHERE service == ?service
| EVAL owner = CONCAT(service, "-team")
| KEEP service, errors, owner`;

/** A new app: nothing in it yet, so that it is shown an empty state and not an example. */
export const createEmptyDocument = (): AppDocument => ({
  state: {},
  root: { type: 'stack', id: 'root', direction: 'vertical', children: [] },
});

/** What the numbers of the example are, which need no index. */
export const SERVICES_COUNT_QUERY = 'ROW now = 4, before = 3';
export const ERRORS_COUNT_QUERY = 'ROW now = 47, before = 52';
export const ERROR_BUDGET_QUERY = 'ROW used = 62';

const t = (id: string, defaultMessage: string) =>
  i18n.translate(`xpack.customApp.defaultDocument.${id}`, { defaultMessage });

/**
 * An example to start from, which works on any cluster. It is small on purpose, and shows what an
 * app is made of: values that inputs set and components read, a page that can be given a look, and
 * what is shown or hidden by a value.
 */
export const createDefaultDocument = (): AppDocument => ({
  state: {
    service: { type: 'string', default: '' },
    nameFilter: { type: 'string', default: '' },
    minErrors: { type: 'string', default: '0' },
    look: { type: 'string', default: 'teal' },
    show_tips: { type: 'boolean', default: true },
  },
  // The accent is whatever the picker says, which is how an input drives a property.
  theme: { accent: stateRef('look'), shape: 'soft' },
  root: {
    type: 'stack',
    id: 'root',
    direction: 'vertical',
    children: [
      { type: 'heading', id: 'title', text: t('title', 'Your custom app') },
      {
        type: 'text',
        id: 'intro',
        text: t(
          'intro',
          'A small working app to change into your own. Ask the assistant to change anything: the data, the components, the look.'
        ),
      },
      {
        type: 'stack',
        id: 'look-bar',
        direction: 'horizontal',
        children: [
          {
            type: 'button_group',
            id: 'look-picker',
            label: t('lookLabel', 'Accent'),
            bind: 'look',
            options: [
              { value: 'teal', label: t('lookTeal', 'Teal') },
              { value: 'purple', label: t('lookPurple', 'Purple') },
              { value: 'orange', label: t('lookOrange', 'Orange') },
              { value: 'blue', label: t('lookBlue', 'Blue') },
            ],
            onChange: [],
          },
          {
            type: 'switch',
            id: 'tips-switch',
            label: t('tipsLabel', 'Show tips'),
            bind: 'show_tips',
            onChange: [],
          },
        ],
      },
      {
        type: 'callout',
        id: 'tips',
        title: t('tipsTitle', 'Everything here follows the values of the app'),
        text: t(
          'tipsText',
          'The accent follows the picker, this tip follows the switch, and selecting a service in the table opens its details.'
        ),
        color: 'primary',
        visibleWhen: { $state: 'show_tips' },
      },
      {
        type: 'columns',
        id: 'kpis',
        columns: 3,
        children: [
          {
            type: 'card',
            id: 'card-services',
            title: t('cardServices', 'Services'),
            icon: 'globe',
            children: [
              {
                type: 'metric',
                id: 'metric-services',
                title: t('metricServices', 'Services running'),
                query: SERVICES_COUNT_QUERY,
                compare: 'before',
                betterWhen: 'higher',
              },
            ],
          },
          {
            type: 'card',
            id: 'card-errors',
            title: t('cardErrors', 'Errors'),
            icon: 'alert',
            children: [
              {
                type: 'metric',
                id: 'metric-errors',
                title: t('metricErrors', 'Errors in the last hour'),
                query: ERRORS_COUNT_QUERY,
                compare: 'before',
                betterWhen: 'lower',
              },
            ],
          },
          {
            type: 'card',
            id: 'card-budget',
            title: t('cardBudget', 'Error budget'),
            icon: 'check',
            children: [
              {
                type: 'progress',
                id: 'budget',
                label: t('budgetLabel', 'Used'),
                query: ERROR_BUDGET_QUERY,
                max: 100,
                color: 'success',
              },
              {
                type: 'badge',
                id: 'budget-status',
                text: t('budgetStatus', 'On track'),
                color: 'success',
              },
            ],
          },
        ],
      },
      {
        type: 'tabs',
        id: 'tabs',
        children: [
          {
            type: 'section',
            id: 'tab-services',
            label: t('tabServices', 'Services'),
            children: [
              {
                type: 'stack',
                id: 'filters',
                direction: 'horizontal',
                children: [
                  {
                    type: 'search',
                    id: 'name-filter',
                    label: t('nameFilterLabel', 'Service name'),
                    placeholder: t('nameFilterPlaceholder', 'Search services'),
                    bind: 'nameFilter',
                    onChange: [],
                  },
                  {
                    type: 'select',
                    id: 'min-errors',
                    label: t('minErrorsLabel', 'Errors'),
                    bind: 'minErrors',
                    options: [
                      { value: '0', label: t('minErrorsAny', 'Any') },
                      { value: '10', label: t('minErrors10', '10 or more') },
                      { value: '20', label: t('minErrors20', '20 or more') },
                    ],
                    onChange: [],
                  },
                ],
              },
              {
                type: 'table',
                id: 'services-table',
                query: SERVICES_QUERY,
                caption: t('tableCaption', 'Services and their error counts'),
                columns: [
                  { field: 'service', label: 'Service' },
                  { field: 'errors', label: 'Errors' },
                ],
                onRowClick: [
                  { type: 'setState', key: 'service', value: { fromColumn: 'service' } },
                  { type: 'openFlyout', flyout: 'service-flyout' },
                ],
              },
              {
                type: 'flyout',
                id: 'service-flyout',
                title: i18n.translate('xpack.customApp.defaultDocument.flyoutTitle', {
                  defaultMessage: 'Service {service}',
                  // The reference is data, not translatable text; i18n would read the braces as a
                  // placeholder.
                  values: { service: '{{state.service}}' },
                }),
                children: [
                  { type: 'key_value', id: 'service-detail', query: SERVICE_DETAIL_QUERY },
                ],
              },
            ],
          },
          {
            type: 'section',
            id: 'tab-about',
            label: t('tabAbout', 'What you can do'),
            children: [
              {
                type: 'text',
                id: 'about',
                text: t(
                  'about',
                  '- Ask the assistant to **use your own data**, with ES|QL queries.\n- Add **charts**, tables, cards, tabs and more.\n- Let people **pick** a value and have anything in the app follow it: a colour, a number, what is shown.\n- Run a **workflow** from a button or a form.'
                ),
              },
            ],
          },
        ],
      },
    ],
  },
});
