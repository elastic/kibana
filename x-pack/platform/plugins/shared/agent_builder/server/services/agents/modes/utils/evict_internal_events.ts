/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filter, type OperatorFunction } from 'rxjs';
import type { ConvertedEvents } from '../default/convert_graph_events';
import { isInternalEvent, type InternalEvent } from '../default/events';

type ExternalEvents = Exclude<ConvertedEvents, InternalEvent>;

export const evictInternalEvents = (): OperatorFunction<ConvertedEvents, ExternalEvents> => {
  return filter((event): event is ExternalEvents => !isInternalEvent(event));
};
