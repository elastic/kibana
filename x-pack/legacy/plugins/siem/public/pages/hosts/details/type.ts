/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionCreator } from 'typescript-fsa';

import { InputsModelId } from '../../../store/inputs/constants';
import { HostComponentProps } from '../../../components/link_to/redirect_to_hosts';
import { HostsTableType } from '../../../store/hosts/model';
import { HostsQueryProps } from '../hosts';
import { NavTab } from '../../../components/navigation/types';
import {
  AnonamaliesChildren,
  CommonChildren,
  KeyHostsNavTabWithoutMlPermission,
} from '../navigation';

interface HostDetailsComponentReduxProps {
  filterQueryExpression: string;
}

interface HostDetailsComponentDispatchProps {
  setAbsoluteRangeDatePicker: ActionCreator<{
    id: InputsModelId;
    from: number;
    to: number;
  }>;
  detailName: string;
}

export interface HostDetailsBodyProps extends HostsQueryProps {
  children: CommonChildren | AnonamaliesChildren;
}

export type HostDetailsComponentProps = HostDetailsComponentReduxProps &
  HostDetailsComponentDispatchProps &
  HostComponentProps &
  HostsQueryProps;

export type HostDetailsBodyComponentProps = HostDetailsComponentReduxProps &
  HostDetailsComponentDispatchProps &
  HostDetailsBodyProps;

type KeyHostDetailsNavTabWithoutMlPermission = HostsTableType.authentications &
  HostsTableType.uncommonProcesses &
  HostsTableType.events;

type KeyHostDetailsNavTabWithMlPermission = KeyHostsNavTabWithoutMlPermission &
  HostsTableType.anomalies;

type KeyHostDetailsNavTab =
  | KeyHostDetailsNavTabWithoutMlPermission
  | KeyHostDetailsNavTabWithMlPermission;

export type HostDetailsNavTab = Record<KeyHostDetailsNavTab, NavTab>;
