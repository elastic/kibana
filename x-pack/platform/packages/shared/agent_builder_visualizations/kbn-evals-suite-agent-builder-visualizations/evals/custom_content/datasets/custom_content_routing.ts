/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoutingExample } from '../../../src/custom_content/routing/types';

const LOGS = 'kibana_sample_data_logs';
const FLIGHTS = 'kibana_sample_data_flights';

/**
 * Requests only an HTML layout can express: colored status badges, a board of cards, narrative text
 * around live values. None says "custom panel", so the agent has to choose custom content itself.
 */
const NEEDS_CUSTOM_CONTENT: RoutingExample[] = [
  {
    input: {
      question: `Show a health board for ${LOGS}: one card per machine.os with the request count, the error rate (response codes 5xx) and a green, amber or red status badge.`,
    },
    output: { renderer: 'custom_content' },
    metadata: { useCase: 'status-board' },
  },
  {
    input: {
      question: `Build a scorecard for ${LOGS}: total requests, average bytes and distinct clients as three big numbers, each with a colored arrow that is green when it is good.`,
    },
    output: { renderer: 'custom_content' },
    metadata: { useCase: 'scorecard' },
  },
  {
    input: {
      question: `Write a short summary sentence for ${FLIGHTS} that reads like "N flights, X% delayed, Y% cancelled", with the numbers live and the delayed share highlighted in red when it is above 20%.`,
    },
    output: { renderer: 'custom_content' },
    metadata: { useCase: 'narrative-with-values' },
  },
];

/** Requests a chart handles well, which should stay in Lens or Vega. */
const FITS_A_CHART: RoutingExample[] = [
  {
    input: { question: `Show the number of requests over time for ${LOGS} as a line chart.` },
    output: { renderer: 'lens' },
    metadata: { useCase: 'line-chart' },
  },
  {
    input: { question: `Show the share of requests by machine.os in ${LOGS} as a pie chart.` },
    output: { renderer: 'lens' },
    metadata: { useCase: 'pie-chart' },
  },
  {
    input: {
      question: `Create a table visualization of the top 10 geo.src countries by request count in ${LOGS}.`,
    },
    output: { renderer: 'lens' },
    metadata: { useCase: 'table' },
  },
  {
    input: { question: `Show the total number of flights in ${FLIGHTS} as a single metric.` },
    output: { renderer: 'lens' },
    metadata: { useCase: 'metric' },
  },
];

export const CUSTOM_CONTENT_ROUTING_EXAMPLES: RoutingExample[] = [
  ...NEEDS_CUSTOM_CONTENT,
  ...FITS_A_CHART,
];
