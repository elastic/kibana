/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TimeRange } from 'ui/timefilter/time_history';
import {
  ContainerInput,
  Container,
  ContainerOutput,
  EmbeddableFactory,
} from '../../../../../../src/legacy/core_plugins/embeddable_api/public';

interface ContainerTimeRangeInput extends ContainerInput {
  timeRange: TimeRange;
}

const TIME_RANGE_CONTAINER = 'TIME_RANGE_CONTAINER';

export class TimeRangeContainer extends Container<
  { timeRange: TimeRange },
  ContainerTimeRangeInput,
  ContainerOutput
> {
  public readonly type = TIME_RANGE_CONTAINER;
  constructor(
    initialInput: ContainerTimeRangeInput,
    embeddableFactories: Map<string, EmbeddableFactory>,
    parent?: Container
  ) {
    super(initialInput, { embeddableLoaded: {} }, embeddableFactories, parent);
  }

  public getInheritedInput() {
    return { timeRange: this.input.timeRange };
  }

  public render() {}

  public reload() {}
}
