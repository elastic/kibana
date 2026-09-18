/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceIdentifier } from 'inversify';
import type { MetricCollectorFactoryContract, MetricRecorder } from './types';

/**
 * Multi-injection token for {@link MetricRecorder}s. Add a new recorder by
 * binding it under this token — the middleware picks up every bound recorder
 * automatically.
 */
export const MetricRecorderToken = Symbol.for(
  'alerting_v2.MetricRecorder'
) as ServiceIdentifier<MetricRecorder>;

/**
 * Token for the {@link MetricCollectorFactoryContract} the pipeline uses to
 * create a fresh collector per run.
 */
export const MetricCollectorFactoryToken = Symbol.for(
  'alerting_v2.MetricCollectorFactory'
) as ServiceIdentifier<MetricCollectorFactoryContract>;
