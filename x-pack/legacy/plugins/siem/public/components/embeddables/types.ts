/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Filter as ESFilterType } from '@kbn/es-query';
import { TimeRange } from 'src/plugins/data/public';
import {
  EmbeddableInput,
  EmbeddableOutput,
  IEmbeddable,
} from '../../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public';
import { inputsModel } from '../../store/inputs';

export interface MapEmbeddableInput extends EmbeddableInput {
  filters: ESFilterType[];
  query: {
    query: string;
    language: string;
  };
  refreshConfig: {
    isPaused: boolean;
    interval: number;
  };
  timeRange?: TimeRange;
}

export type MapEmbeddable = IEmbeddable<MapEmbeddableInput, EmbeddableOutput>;

export interface IndexPatternMapping {
  title: string;
  id: string;
}

export type SetQuery = (params: {
  id: string;
  inspect: inputsModel.InspectQuery | null;
  loading: boolean;
  refetch: inputsModel.Refetch;
}) => void;
