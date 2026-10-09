/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSwitch } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { useAgentlessResources } from '../../../hooks';

export const AgentlessResourcesToggle: React.FunctionComponent = () => {
  const { showAgentless, setShowAgentless } = useAgentlessResources();

  return (
    <EuiSwitch
      label={i18n.translate('xpack.fleet.debug.agentlessResourcesToggle.label', {
        defaultMessage: 'Show agentless agents and policies in Fleet',
      })}
      checked={showAgentless}
      onChange={(e) => setShowAgentless(e.target.checked)}
      data-test-subj="showAgentlessResourcesSwitch"
    />
  );
};
