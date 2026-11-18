/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { chatCompletionReasoningEfforts } from '@kbn/inference-common';
import type { ReasoningEffortLevel } from '../../../common/types';
import { isReasoningEffortLevel } from '../../../common/type_guards';

interface ReasoningEffortButtonGroupProps {
  effort?: ReasoningEffortLevel;
  supportedLevels: ReasoningEffortLevel[];
  onChange: (effort: ReasoningEffortLevel) => void;
}

export const ReasoningEffortButtonGroup: React.FC<ReasoningEffortButtonGroupProps> = ({
  effort,
  supportedLevels,
  onChange,
}) => (
  <EuiButtonGroup
    legend={i18n.translate('xpack.searchInferenceEndpoints.settings.reasoningEffort.legend', {
      defaultMessage: 'Reasoning effort level',
    })}
    type="single"
    isFullWidth
    buttonSize="compressed"
    idSelected={effort ?? ''}
    onChange={(id) => {
      if (isReasoningEffortLevel(id)) {
        onChange(id);
      }
    }}
    options={chatCompletionReasoningEfforts
      .filter((level) => supportedLevels.includes(level))
      .map((level) => ({ id: level, label: level, 'data-test-subj': `reasoningEffort-${level}` }))}
    data-test-subj="reasoningEffortButtonGroup"
  />
);
