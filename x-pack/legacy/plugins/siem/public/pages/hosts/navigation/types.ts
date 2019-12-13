/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IIndexPattern } from 'src/plugins/data/public';
import { NarrowDateRange } from '../../../components/ml/types';
import { ESTermQuery } from '../../../../common/typed_json';
import { InspectQuery, Refetch } from '../../../store/inputs/model';

import { HostsTableType, HostsType } from '../../../store/hosts/model';
import { NavTab } from '../../../components/navigation/types';
import { UpdateDateRange } from '../../../components/charts/common';

export type KeyHostsNavTabWithoutMlPermission = HostsTableType.hosts &
  HostsTableType.authentications &
  HostsTableType.uncommonProcesses &
  HostsTableType.events;

type KeyHostsNavTabWithMlPermission = KeyHostsNavTabWithoutMlPermission & HostsTableType.anomalies;

type KeyHostsNavTab = KeyHostsNavTabWithoutMlPermission | KeyHostsNavTabWithMlPermission;

export type HostsNavTab = Record<KeyHostsNavTab, NavTab>;

export type SetQuery = ({
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

export interface QueryTabBodyProps {
  type: HostsType;
  startDate: number;
  endDate: number;
  filterQuery?: string | ESTermQuery;
}

export type HostsComponentsQueryProps = QueryTabBodyProps & {
  deleteQuery?: ({ id }: { id: string }) => void;
  indexPattern: IIndexPattern;
  skip: boolean;
  setQuery: SetQuery;
  updateDateRange?: UpdateDateRange;
  narrowDateRange?: NarrowDateRange;
};

export type CommonChildren = (args: HostsComponentsQueryProps) => JSX.Element;
