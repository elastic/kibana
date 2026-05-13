/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { RedirectTo } from '../redirect_to';
import { useStreamsPrivileges } from '../../hooks/use_streams_privileges';

/**
 * Redirects to the default stream management tab: Overview when enabled, otherwise Retention.
 * Query streams without a Retention tab redirect again to Schema from QueryStreamDetailManagement.
 */
export function StreamManagementDefaultRedirect() {
  const {
    features: { overviewPage },
  } = useStreamsPrivileges();

  const tab = overviewPage.enabled ? 'overview' : 'retention';

  return <RedirectTo path="/{key}/management/{tab}" params={{ path: { tab } }} />;
}
