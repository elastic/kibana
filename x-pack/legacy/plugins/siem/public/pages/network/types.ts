/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Filter } from '@kbn/es-query';
import { RouteComponentProps } from 'react-router-dom';
import { ActionCreator } from 'typescript-fsa';
import { Query } from 'src/plugins/data/common';

import { FlowTarget } from '../../graphql/types';
import { GlobalTimeArgs } from '../../containers/global_time';
import { InputsModelId } from '../../store/inputs/constants';

export type SetAbsoluteRangeDatePicker = ActionCreator<{
  id: InputsModelId;
  from: number;
  to: number;
}>;

interface NetworkComponentReduxProps {
  filters: Filter[];
  query: Query;
  setAbsoluteRangeDatePicker: SetAbsoluteRangeDatePicker;
}

export type NetworkComponentProps = NetworkComponentReduxProps &
  GlobalTimeArgs &
  Partial<RouteComponentProps<{}>> & {
    networkPagePath: string;
    hasMlUserPermissions: boolean;
    capabilitiesFetched: boolean;
  };

interface IPDetailsComponentReduxProps {
  filters: Filter[];
  flowTarget: FlowTarget;
  query: Query;
}

interface IPDetailsComponentDispatchProps {
  setAbsoluteRangeDatePicker: SetAbsoluteRangeDatePicker;
  setIpDetailsTablesActivePageToZero: ActionCreator<null>;
}

export type IPDetailsComponentProps = IPDetailsComponentReduxProps &
  IPDetailsComponentDispatchProps &
  GlobalTimeArgs & { detailName: string };
