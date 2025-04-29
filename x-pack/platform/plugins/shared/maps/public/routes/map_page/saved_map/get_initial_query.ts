/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getData } from '../../../kibana_services';
import { MapsAppState } from '../url_state';
import { ParsedMapStateJSON } from './types';

export function getInitialQuery({
  mapState,
  appState = {},
}: {
  mapState?: ParsedMapStateJSON;
  appState: MapsAppState;
}) {
  if (appState.query) {
    return appState.query;
  }

  if (mapState?.query) {
    return mapState.query;
  }

  return getData().query.queryString.getDefaultQuery();
}
