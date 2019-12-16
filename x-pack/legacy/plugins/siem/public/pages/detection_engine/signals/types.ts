/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { esFilters } from '../../../../../../../../src/plugins/data/common/es_query';
import { TimelineNonEcsData } from '../../../graphql/types';
import { KueryFilterQuery, SerializedFilterQuery } from '../../../store';

export interface SetEventsLoadingProps {
  eventIds: string[];
  isLoading: boolean;
}

export interface SetEventsDeletedProps {
  eventIds: string[];
  isDeleted: boolean;
}

export interface UpdateSignalsStatusProps {
  signalIds: string[];
  status: 'open' | 'closed';
}

export type UpdateSignalsStatus = ({ signalIds, status }: UpdateSignalsStatusProps) => void;

export interface UpdateSignalStatusActionProps {
  signalIds: string[];
  status: 'open' | 'closed';
  setEventsLoading: ({ eventIds, isLoading }: SetEventsLoadingProps) => void;
  setEventsDeleted: ({ eventIds, isDeleted }: SetEventsDeletedProps) => void;
  kbnVersion: string;
}

export type SendSignalsToTimeline = () => void;

export interface SendSignalsToTimelineActionProps {
  createTimeline: CreateTimeline;
  data: TimelineNonEcsData[];
}

export interface CreateTimelineProps {
  id: string;
  kqlQuery?: {
    filterQuery: SerializedFilterQuery | null;
    filterQueryDraft: KueryFilterQuery | null;
  };
  filters?: esFilters.Filter[];
  dateRange?: { start: number; end: number };
}

export type CreateTimeline = ({ id, kqlQuery, filters, dateRange }: CreateTimelineProps) => void;
