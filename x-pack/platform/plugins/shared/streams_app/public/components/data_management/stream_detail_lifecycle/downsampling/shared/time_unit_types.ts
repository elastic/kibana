/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsTimeUnit } from '../../helpers/format_size_units';

/**
 * Time units offered by the UI selectors by default.
 */
export type TimeUnit = Extract<StreamsTimeUnit, 'd' | 'h' | 'm' | 's'>;

/**
 * Units that can appear in persisted config (e.g. `ms`, `micros`, `nanos`) and should be preserved
 * and round-tripped when encountered.
 */
export type PreservedTimeUnit = StreamsTimeUnit;
