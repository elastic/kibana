/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ApolloClient from 'apollo-client';

import { Ecs } from '../../../../graphql/types';
import { TimelineModel } from '../../../../store/timeline/model';
import { inputsModel } from '../../../../store';

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

export type UpdateSignalsStatusCallback = (
  refetchQuery: inputsModel.Refetch,
  { signalIds, status }: UpdateSignalsStatusProps
) => void;
export type UpdateSignalsStatus = ({ signalIds, status }: UpdateSignalsStatusProps) => void;

export interface UpdateSignalStatusActionProps {
  query?: string;
  signalIds: string[];
  status: 'open' | 'closed';
  setEventsLoading: ({ eventIds, isLoading }: SetEventsLoadingProps) => void;
  setEventsDeleted: ({ eventIds, isDeleted }: SetEventsDeletedProps) => void;
}

export type SendSignalsToTimeline = () => void;

export interface SendSignalToTimelineActionProps {
  apolloClient?: ApolloClient<{}>;
  createTimeline: CreateTimeline;
  ecsData: Ecs;
  updateTimelineIsLoading: ({ id, isLoading }: { id: string; isLoading: boolean }) => void;
}

export interface CreateTimelineProps {
  from: number;
  timeline: TimelineModel;
  to: number;
}

export type CreateTimeline = ({ from, timeline, to }: CreateTimelineProps) => void;
