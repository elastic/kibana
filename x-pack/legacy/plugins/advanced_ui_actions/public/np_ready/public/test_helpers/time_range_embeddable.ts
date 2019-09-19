/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TimeRange } from '../../../../../../../../src/plugins/data/public';
import {
  EmbeddableOutput,
  Embeddable,
  EmbeddableInput,
  IContainer,
} from '../../../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public';

interface EmbeddableTimeRangeInput extends EmbeddableInput {
  timeRange: TimeRange;
}

export const TIME_RANGE_EMBEDDABLE = 'TIME_RANGE_EMBEDDABLE';

export class TimeRangeEmbeddable extends Embeddable<EmbeddableTimeRangeInput, EmbeddableOutput> {
  public readonly type = TIME_RANGE_EMBEDDABLE;

  constructor(initialInput: EmbeddableTimeRangeInput, parent?: IContainer) {
    super(initialInput, {}, parent);
  }

  public render() {}

  public reload() {}
}
