/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RouteComponentProps } from 'react-router-dom';
import { ActionCreator } from 'typescript-fsa';
import { GlobalTimeArgs } from '../../containers/global_time';
import { InputsModelId } from '../../store/inputs/constants';
import { Query, esFilters } from '../../../../../../../src/plugins/data/public';

export type SetAbsoluteRangeDatePicker = ActionCreator<{
  id: InputsModelId;
  from: number;
  to: number;
}>;

interface NetworkComponentReduxProps {
  filters: esFilters.Filter[];
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
