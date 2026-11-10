/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { RedirectTo } from '../redirect_to';
import { StreamCheckLoading } from './stream_check_loading';
import { useShowClassicTab } from './use_show_classic_tab';

/** Redirects to the default tab of `unitId`, or of the current unit when none is given. */
export function StreamsLayoutDefaultTabRedirect({ unitId }: { unitId?: string }) {
  const { loading, showClassic } = useShowClassicTab();

  if (loading) {
    return <StreamCheckLoading />;
  }

  // Switch to `map` once the new experience is GA.
  const tab = showClassic ? 'classic' : 'map';

  return (
    <RedirectTo
      path="/v2/unit/{unitId}/{tab}"
      params={{ path: unitId ? { unitId, tab } : { tab } }}
    />
  );
}
