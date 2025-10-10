/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import type { IlmLocatorParams } from '@kbn/index-lifecycle-management-common-shared';
import { ILM_LOCATOR_ID } from '@kbn/index-lifecycle-management-common-shared';
import type { IngestStreamLifecycleILM } from '@kbn/streams-schema';
import { useKibana } from '../../../../hooks/use_kibana';

export function IlmLink({ lifecycle }: { lifecycle: IngestStreamLifecycleILM }) {
  const {
    dependencies: {
      start: { share },
    },
  } = useKibana();

  const ilmLocator = share.url.locators.get<IlmLocatorParams>(ILM_LOCATOR_ID);
  return (
    <EuiLink
      target="_blank"
      data-test-subj="streamsAppLifecycleBadgeIlmPolicyNameLink"
      href={ilmLocator?.getRedirectUrl({
        page: 'policy_edit',
        policyName: lifecycle.ilm.policy,
      })}
    >
      {lifecycle.ilm.policy}
    </EuiLink>
  );
}
