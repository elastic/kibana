/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { StaticIndexPattern } from 'ui/index_patterns';
import { NarrowDateRange } from '../../../components/ml/types';
import { hostsModel } from '../../../store';
import { ESTermQuery } from '../../../../common/typed_json';
import { InspectQuery, Refetch } from '../../../store/inputs/model';

import { HostsTableType } from '../../../store/hosts/model';
import { NavTab } from '../../../components/navigation/types';

export type KeyHostsNavTabWithoutMlPermission = HostsTableType.hosts &
  HostsTableType.authentications &
  HostsTableType.uncommonProcesses &
  HostsTableType.events;

type KeyHostsNavTabWithMlPermission = KeyHostsNavTabWithoutMlPermission & HostsTableType.anomalies;

type KeyHostsNavTab = KeyHostsNavTabWithoutMlPermission | KeyHostsNavTabWithMlPermission;

export type HostsNavTab = Record<KeyHostsNavTab, NavTab>;

interface QueryTabBodyProps {
  type: hostsModel.HostsType;
  startDate: number;
  endDate: number;
  filterQuery?: string | ESTermQuery;
  kqlQueryExpression: string;
}

export type AnomaliesQueryTabBodyProps = QueryTabBodyProps & {
  skip: boolean;
  narrowDateRange: NarrowDateRange;
  hostName?: string;
};

export type HostsComponentsQueryProps = QueryTabBodyProps & {
  deleteQuery?: ({ id }: { id: string }) => void;
  indexPattern: StaticIndexPattern;
  skip: boolean;
  setQuery: ({
    id,
    inspect,
    loading,
    refetch,
  }: {
    id: string;
    inspect: InspectQuery | null;
    loading: boolean;
    refetch: Refetch;
  }) => void;
  narrowDateRange?: NarrowDateRange;
};

export type CommonChildren = (args: HostsComponentsQueryProps) => JSX.Element;
export type AnomaliesChildren = (args: AnomaliesQueryTabBodyProps) => JSX.Element;
