/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TimeRange } from '../../../../../../../../src/plugins/data/public';
import {
  EmbeddableInput,
  IContainer,
  EmbeddableFactory,
} from '../../../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public';
import { TIME_RANGE_EMBEDDABLE, TimeRangeEmbeddable } from './time_range_embeddable';

interface EmbeddableTimeRangeInput extends EmbeddableInput {
  timeRange: TimeRange;
}

export class TimeRangeEmbeddableFactory extends EmbeddableFactory<EmbeddableTimeRangeInput> {
  public readonly type = TIME_RANGE_EMBEDDABLE;

  public isEditable() {
    return true;
  }

  public async create(initialInput: EmbeddableTimeRangeInput, parent?: IContainer) {
    return new TimeRangeEmbeddable(initialInput, parent);
  }

  public getDisplayName() {
    return 'time range';
  }
}
