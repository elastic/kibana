/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { STREAMS_DEFAULT_UNIT_ID } from '@kbn/streams-plugin/common';
import { useStreamsAppParams } from '../../hooks/use_streams_app_params';
import { RedirectTo } from '../redirect_to';
import { StreamsAppPageTemplate } from '../streams_app_page_template';
import { defaultStreamsLayoutTab } from './tab_ids';
import { useShowClassicTab } from './use_show_classic_tab';

/** Replaces an entry URL with Classic or the Map once the classic-stream check has settled. */
export function RedirectToDefaultLayoutTab() {
  const params = useStreamsAppParams('/v2/unit/{unitId}', true);
  const unitId = params?.path.unitId ?? STREAMS_DEFAULT_UNIT_ID;
  const { loading, showClassic } = useShowClassicTab();

  if (loading) {
    return (
      <StreamsAppPageTemplate.EmptyPrompt
        data-test-subj="streamsClassicTabLoading"
        icon={<EuiLoadingSpinner size="xl" />}
      />
    );
  }

  return (
    <RedirectTo
      path="/v2/unit/{unitId}/{tab}"
      params={{ path: { unitId, tab: defaultStreamsLayoutTab(showClassic) } }}
    />
  );
}
