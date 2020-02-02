/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RouteComponentProps } from 'react-router-dom';
import { ActionCreator } from 'typescript-fsa';
import { InputsModelId } from '../../store/inputs/constants';
import { GlobalTimeArgs } from '../../containers/global_time';

export type SetAbsoluteRangeDatePicker = ActionCreator<{
  id: InputsModelId;
  from: number;
  to: number;
}>;

export type NetworkComponentProps = Partial<RouteComponentProps<{}>> &
  GlobalTimeArgs & {
    networkPagePath: string;
    hasMlUserPermissions: boolean;
    capabilitiesFetched: boolean;
  };
