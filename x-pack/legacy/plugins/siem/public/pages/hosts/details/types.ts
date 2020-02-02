/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionCreator } from 'typescript-fsa';
import { IIndexPattern, esFilters } from 'src/plugins/data/public';
import { InputsModelId } from '../../../store/inputs/constants';
import { HostsTableType } from '../../../store/hosts/model';
import { HostsQueryProps } from '../types';
import { NavTab } from '../../../components/navigation/types';
import { KeyHostsNavTabWithoutMlPermission } from '../navigation/types';
import { hostsModel } from '../../../store';

export interface HostDetailsProps extends HostsQueryProps {
  detailName: string;
  hostDetailsPagePath: string;
}

type KeyHostDetailsNavTabWithoutMlPermission = HostsTableType.authentications &
  HostsTableType.uncommonProcesses &
  HostsTableType.events;

type KeyHostDetailsNavTabWithMlPermission = KeyHostsNavTabWithoutMlPermission &
  HostsTableType.anomalies;

type KeyHostDetailsNavTab =
  | KeyHostDetailsNavTabWithoutMlPermission
  | KeyHostDetailsNavTabWithMlPermission;

export type HostDetailsNavTab = Record<KeyHostDetailsNavTab, NavTab>;

export type HostDetailsTabsProps = HostDetailsProps & {
  pageFilters?: esFilters.Filter[];
  filterQuery: string;
  indexPattern: IIndexPattern;
  type: hostsModel.HostsType;
  setAbsoluteRangeDatePicker: SetAbsoluteRangeDatePicker;
};

export type SetAbsoluteRangeDatePicker = ActionCreator<{
  id: InputsModelId;
  from: number;
  to: number;
}>;
