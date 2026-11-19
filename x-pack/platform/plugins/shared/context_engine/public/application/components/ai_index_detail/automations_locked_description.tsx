/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { useNavigation } from '../../hooks/use_navigation';
import { getAiIndexSourcesPath } from '../../paths';

interface AutomationsLockedDescriptionProps {
  aiIndexId: string;
  bodyMessageId?: string;
  addSourceLinkMessageId?: string;
}

export const AutomationsLockedDescription = ({
  aiIndexId,
  bodyMessageId = 'xpack.contextEngine.aiIndexDetail.automations.lockedBody',
  addSourceLinkMessageId = 'xpack.contextEngine.aiIndexDetail.automations.lockedAddSourceLink',
}: AutomationsLockedDescriptionProps) => {
  const { navigateToContextEngine } = useNavigation();

  const addSourceLink = (
    <EuiLink
      onClick={() => navigateToContextEngine(getAiIndexSourcesPath(aiIndexId))}
      data-test-subj="contextAutomationsLockedAddSourceLink"
    >
      <FormattedMessage id={addSourceLinkMessageId} defaultMessage="Add a source" />
    </EuiLink>
  );

  return (
    <FormattedMessage
      id={bodyMessageId}
      defaultMessage="Add a source and Context creates automations for it. {addSourceLink}"
      values={{ addSourceLink }}
    />
  );
};
