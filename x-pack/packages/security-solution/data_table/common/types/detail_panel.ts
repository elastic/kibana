/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

type EmptyObject = Record<string | number, never>;

export enum FlowTargetSourceDest {
  destination = 'destination',
  source = 'source',
}

export type ExpandedEventType =
  | {
      panelView?: 'eventDetail';
      params?: {
        eventId: string;
        indexName: string;
        refetch?: () => void;
      };
    }
  | EmptyObject;

export type ExpandedHostType =
  | {
      panelView?: 'hostDetail';
      params?: {
        hostName: string;
      };
    }
  | EmptyObject;

export type ExpandedNetworkType =
  | {
      panelView?: 'networkDetail';
      params?: {
        ip: string;
        flowTarget: FlowTargetSourceDest;
      };
    }
  | EmptyObject;

export type ExpandedUserType =
  | {
      panelView?: 'userDetail';
      params?: {
        userName: string;
      };
    }
  | EmptyObject;

export type ExpandedDetailType =
  | ExpandedEventType
  | ExpandedHostType
  | ExpandedNetworkType
  | ExpandedUserType;

export enum TimelineTabs {
  query = 'query',
  graph = 'graph',
  notes = 'notes',
  pinned = 'pinned',
  eql = 'eql',
  session = 'session',
}

export type ExpandedDetailTimeline = {
  [tab in TimelineTabs]?: ExpandedDetailType;
};

export type ExpandedDetail = Partial<Record<string, ExpandedDetailType>>;
