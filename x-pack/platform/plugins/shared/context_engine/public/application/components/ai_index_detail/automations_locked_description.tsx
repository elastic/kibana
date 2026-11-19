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
}

export const AutomationsLockedDescription = ({ aiIndexId }: AutomationsLockedDescriptionProps) => {
  const { createContextEngineUrl, navigateToContextEngine } = useNavigation();
  const sourcesPath = getAiIndexSourcesPath(aiIndexId);

  const addSourceLink = (
    <EuiLink
      href={createContextEngineUrl(sourcesPath)}
      onClick={(event: React.MouseEvent) => {
        event.preventDefault();
        navigateToContextEngine(sourcesPath);
      }}
      data-test-subj="contextAutomationsLockedAddSourceLink"
    >
      <FormattedMessage
        id="xpack.contextEngine.aiIndexDetail.automations.lockedAddSourceLink"
        defaultMessage="Add a source"
      />
    </EuiLink>
  );

  return (
    <FormattedMessage
      id="xpack.contextEngine.aiIndexDetail.automations.lockedBody"
      defaultMessage="Add a source and Context creates automations for it. {addSourceLink}"
      values={{ addSourceLink }}
    />
  );
};
