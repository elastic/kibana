/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import { IlmLocatorParams } from '@kbn/index-lifecycle-management-common-shared';
import { LocatorPublic } from '@kbn/share-plugin/common';
import { IngestStreamLifecycleILM } from '@kbn/streams-schema';
import { i18n } from '@kbn/i18n';

export function IlmLink({
  ilmLocator,
  lifecycle,
}: {
  ilmLocator?: LocatorPublic<IlmLocatorParams>;
  lifecycle: IngestStreamLifecycleILM;
}) {
  return (
    <EuiLink
      target="_blank"
      data-test-subj="streamsAppLifecycleBadgeIlmPolicyNameLink"
      href={ilmLocator?.getRedirectUrl({
        page: 'policy_edit',
        policyName: lifecycle.ilm.policy,
      })}
    >
      {i18n.translate('xpack.streams.entityDetailViewWithoutParams.ilmBadgeLabel', {
        defaultMessage: 'ILM Policy: {name}',
        values: { name: lifecycle.ilm.policy },
      })}
    </EuiLink>
  );
}
