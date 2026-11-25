/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { STREAMS_DEFAULT_UNIT_ID } from '@kbn/streams-plugin/common';
import { useStreamsAppParams } from '../../hooks/use_streams_app_params';
import { useStreamsPrivileges } from '../../hooks/use_streams_privileges';
import { RedirectTo } from '../redirect_to';
import { defaultStreamsLayoutTab } from './tab_ids';

/** Replaces an entry URL with Classic for users with Streams access, otherwise the Map. */
export function RedirectToDefaultLayoutTab() {
  const params = useStreamsAppParams('/v2/unit/{unitId}', true);
  const unitId = params?.path.unitId ?? STREAMS_DEFAULT_UNIT_ID;
  const {
    access: { legacy },
  } = useStreamsPrivileges();

  return (
    <RedirectTo
      path="/v2/unit/{unitId}/{tab}"
      params={{ path: { unitId, tab: defaultStreamsLayoutTab(legacy) } }}
    />
  );
}
