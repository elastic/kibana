/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DestinationViewModel } from '../../../../streams_layout/destinations/types';

/**
 * The destination types that currently report collector metrics.
 */
export const DESTINATION_TYPES_WITH_STATS: ReadonlyArray<DestinationViewModel['type']> = [
  'elasticsearch',
];
