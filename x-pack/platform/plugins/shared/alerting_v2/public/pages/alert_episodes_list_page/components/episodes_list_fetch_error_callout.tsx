/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { usePageErrors } from '@kbn/alerting-v2-episodes-ui/context/episodes_page_errors_context';
import { EPISODES_LIST_FETCH_ERROR_TITLE } from '../translations';

export const EPISODES_LIST_FETCH_ERROR_TEST_SUBJ = 'alertingV2EpisodesListFetchError';

export const EpisodesListFetchErrorCallout = () => {
  const errors = usePageErrors();

  if (errors.length === 0) {
    return null;
  }

  return (
    <>
      <KbnDangerCallout
        announceOnMount
        title={EPISODES_LIST_FETCH_ERROR_TITLE}
        data-test-subj={EPISODES_LIST_FETCH_ERROR_TEST_SUBJ}
      >
        {errors.map((error) => (
          <p key={error.message}>{error.message}</p>
        ))}
      </KbnDangerCallout>
      <EuiSpacer size="m" />
    </>
  );
};
