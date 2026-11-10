/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomContentDatasetExample } from '../../../src/custom_content/types';

const LOGS = 'kibana_sample_data_logs';
const FLIGHTS = 'kibana_sample_data_flights';

const CREATE_PANEL = 'Create a custom panel';

/**
 * Panels with live data. Each prompt names "custom panel" so the agent does not pick Lens or Vega,
 * which this dataset does not score.
 */
export const CUSTOM_CONTENT_DATA_EXAMPLES: CustomContentDatasetExample[] = [
  {
    input: {
      question: `${CREATE_PANEL} with a status card for each machine.os in ${LOGS}, showing the request count, the error rate (response codes 5xx) and an OK or Warning badge.`,
    },
    output: { data: 'query' },
    metadata: { useCase: 'status-board', dataSource: 'logs' },
  },
  {
    input: {
      question: `${CREATE_PANEL} with a funnel for ${FLIGHTS}: total flights, delayed flights, cancelled flights, with the count at every step.`,
    },
    output: {
      data: 'query',
      rowOrder: ['total', 'delayed', 'cancelled'],
    },
    metadata: { useCase: 'funnel', dataSource: 'flights' },
  },
  {
    input: {
      question: `${CREATE_PANEL} that draws an HTML flow diagram (not a chart) of how requests flow from geo.src country to machine.os in ${LOGS}, with the request count on every hop.`,
    },
    output: { data: 'query' },
    metadata: { useCase: 'flow', dataSource: 'logs' },
  },
  {
    input: {
      question: `${CREATE_PANEL} with an HTML leaderboard of the top 5 machine.os by request count in ${LOGS}: a ranked list where a CSS bar behind each name shows its share.`,
    },
    output: { data: 'query', limit: 5 },
    metadata: { useCase: 'ranking', dataSource: 'logs' },
  },
  {
    input: {
      question: `${CREATE_PANEL} with three KPI cards for ${LOGS}: total requests, average bytes and the number of distinct clients.`,
    },
    output: { data: 'query' },
    metadata: { useCase: 'kpi', dataSource: 'logs' },
  },
  {
    input: {
      question: `${CREATE_PANEL} with an HTML layout that shows the result of this exact query, one styled row per result: FROM ${LOGS} | STATS requests = COUNT(*) BY machine.os`,
    },
    output: {
      data: 'query',
      queryContains: [`FROM ${LOGS}`, 'STATS requests = COUNT(*) BY machine.os'],
    },
    metadata: { useCase: 'user-supplied-query', dataSource: 'logs' },
  },
];

/** Panels with no data. A static panel must not get a query. */
export const CUSTOM_CONTENT_STATIC_EXAMPLES: CustomContentDatasetExample[] = [
  {
    input: {
      question: `${CREATE_PANEL} with a banner: the title "Web Traffic Overview" on a blue gradient with a short subtitle. It needs no data.`,
    },
    output: { data: 'static' },
    metadata: { useCase: 'banner', dataSource: 'none' },
  },
  {
    input: {
      question: `${CREATE_PANEL} with a legend that explains three colors: green means healthy, orange means degraded, red means down. It needs no data.`,
    },
    output: { data: 'static' },
    metadata: { useCase: 'legend', dataSource: 'none' },
  },
];

/** Two-turn conversations: create a panel, then change it. */
export const CUSTOM_CONTENT_EDIT_EXAMPLES: CustomContentDatasetExample[] = [
  {
    input: {
      question: `${CREATE_PANEL} with a status card for each machine.os in ${LOGS}, showing the request count and an OK or Warning badge.`,
      followUp: 'Make the badges blue.',
    },
    output: { data: 'query', edit: 'style' },
    metadata: { useCase: 'style-edit', dataSource: 'logs' },
  },
  {
    input: {
      question: `${CREATE_PANEL} with a status card for each machine.os in ${LOGS}, showing the request count and an OK or Warning badge.`,
      followUp: 'Also show the average bytes per operating system in each card.',
    },
    output: {
      data: 'query',
      edit: 'data',
      addsMeasure: 'AVG(bytes)',
      queryContains: ['machine.os', 'AVG(bytes)'],
    },
    metadata: { useCase: 'data-edit', dataSource: 'logs' },
  },
  {
    input: {
      question: `${CREATE_PANEL} with a banner: the title "Web Traffic Overview" on a blue gradient. It needs no data.`,
      followUp: 'Make the title bigger.',
    },
    output: { data: 'static', edit: 'style' },
    metadata: { useCase: 'static-style-edit', dataSource: 'none' },
  },
  {
    input: {
      question: `${CREATE_PANEL} with a banner: the title "Web Traffic Overview" on a blue gradient. It needs no data.`,
      followUp: `Now show the live total number of requests from ${LOGS} under the title. It must update with the dashboard time range.`,
    },
    output: { data: 'query', edit: 'data', addsMeasure: 'COUNT(', queryContains: ['COUNT('] },
    metadata: { useCase: 'static-to-data-edit', dataSource: 'logs' },
  },
];

export const CUSTOM_CONTENT_EXAMPLES: CustomContentDatasetExample[] = [
  ...CUSTOM_CONTENT_DATA_EXAMPLES,
  ...CUSTOM_CONTENT_STATIC_EXAMPLES,
  ...CUSTOM_CONTENT_EDIT_EXAMPLES,
];
