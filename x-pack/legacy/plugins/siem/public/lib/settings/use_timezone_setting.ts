/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore: path dynamic for kibana
import { timezoneProvider } from 'ui/vis/lib/timezone';
import { npSetup } from 'ui/new_platform';
import { useMemo } from 'react';

export const useTimezoneBrowser = () => {
  const config = npSetup.core.uiSettings;
  const tzValue = useMemo(() => timezoneProvider(config)(), [timezoneProvider, config]);
  return [tzValue];
};
