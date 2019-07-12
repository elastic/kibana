/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TimeRange } from 'ui/timefilter/time_history';
import {
  Embeddable,
  IContainer,
  ContainerInput,
} from '../../../../../src/legacy/core_plugins/embeddable_api/public';
import { TimeRangeInput } from './custom_time_range_action';

interface ContainerTimeRangeInput extends ContainerInput {
  timeRange: TimeRange;
}

export function canInheritTimeRange(embeddable: Embeddable<TimeRangeInput>) {
  if (!embeddable.parent) {
    return false;
  }

  const parent = embeddable.parent;

  return (parent as IContainer<ContainerTimeRangeInput>).getInput().timeRange !== undefined;
}
