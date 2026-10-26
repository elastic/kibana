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
import { useKibana } from '../../../../../hooks/use_kibana';

export function IlmLink({
  policyName,
  'data-test-subj': dataTestSubj = 'streamsAppLifecycleBadgeIlmPolicyNameLink',
}: {
  policyName: string;
  'data-test-subj'?: string;
}) {
  const {
    dependencies: {
      start: { share },
    },
  } = useKibana();

  const ilmLocator = share.url.locators.get<IlmLocatorParams>(ILM_LOCATOR_ID);
  return (
    <EuiLink
      target="_blank"
      data-test-subj={dataTestSubj}
      href={ilmLocator?.getRedirectUrl({
        page: 'policy_edit',
        policyName,
      })}
    >
      {policyName}
    </EuiLink>
  );
}
