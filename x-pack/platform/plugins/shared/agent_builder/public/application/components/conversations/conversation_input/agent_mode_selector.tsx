/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiButtonGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import type { AgentMode } from '@kbn/agent-builder-common';

const agentModeLabel = i18n.translate('xpack.agentBuilder.modeSelector.agent', {
  defaultMessage: 'Agent',
});

const planningModeLabel = i18n.translate('xpack.agentBuilder.modeSelector.planning', {
  defaultMessage: 'Plan',
});

const modeSelectorLegend = i18n.translate('xpack.agentBuilder.modeSelector.legend', {
  defaultMessage: 'Agent mode',
});

const modeOptions = [
  {
    id: 'agent' as AgentMode,
    label: agentModeLabel,
    'data-test-subj': 'agentBuilderModeAgent',
  },
  {
    id: 'planning' as AgentMode,
    label: planningModeLabel,
    'data-test-subj': 'agentBuilderModePlanning',
  },
];

const selectorStyles = css`
  .euiButtonGroupButton {
    min-width: 64px;
  }
`;

interface AgentModeSelectorProps {
  agentMode: AgentMode;
  onModeChange: (mode: AgentMode) => void;
  disabled?: boolean;
}

export const AgentModeSelector: React.FC<AgentModeSelectorProps> = ({
  agentMode,
  onModeChange,
  disabled = false,
}) => {
  const handleChange = useCallback(
    (optionId: string) => {
      onModeChange(optionId as AgentMode);
    },
    [onModeChange]
  );

  const options = useMemo(() => modeOptions, []);

  return (
    <EuiButtonGroup
      legend={modeSelectorLegend}
      options={options}
      idSelected={agentMode}
      onChange={handleChange}
      buttonSize="compressed"
      isDisabled={disabled}
      css={selectorStyles}
      data-test-subj="agentBuilderModeSelector"
    />
  );
};
