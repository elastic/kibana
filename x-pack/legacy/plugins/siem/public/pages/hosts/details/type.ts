/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionCreator } from 'typescript-fsa';

import { InputsModelId } from '../../../store/inputs/constants';
import { CommonChildren, AnonamaliesChildren, HostsQueryProps } from '../hosts';
import { HostComponentProps } from '../../../components/link_to/redirect_to_hosts';

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
