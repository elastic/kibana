/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Query } from 'src/plugins/data/common';
import { TimeRange } from 'src/plugins/data/public';
import {
  EmbeddableInput,
  EmbeddableOutput,
  IEmbeddable,
} from '../../../../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public';

import { Filter } from '../../../../../../../../../src/plugins/data/public';

export interface MapEmbeddableInput extends EmbeddableInput {
  filters: Filter[];
  query: Query;
  refreshConfig: {
    isPaused: boolean;
    interval: number;
  };
  timeRange?: TimeRange;
}

export interface CustomProps {
  setLayerList: Function;
}

export type MapEmbeddable = IEmbeddable<MapEmbeddableInput, EmbeddableOutput> & CustomProps;
