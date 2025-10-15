/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiPageHeaderSection, EuiButton, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { EvaluatorConfig } from '../../../../../common/http_api/evaluations';
import { EvaluatorSelectionModal } from '../modal/evaluator_selection_modal';
import { useEvaluationsData } from '../hooks/use_evaluations_data';
import type { Evaluator } from '../modal/types';

export const HeaderRightActions: React.FC<{}> = () => {
  const { euiTheme } = useEuiTheme();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { runEvaluations } = useEvaluationsData();

  const actionsContainerStyles = css`
    display: flex;
    flex-direction: row;
    gap: ${euiTheme.size.s};
    align-items: center;
    justify-self: end;
  `;

  const labels = {
    container: i18n.translate('xpack.onechat.conversationActions.container', {
      defaultMessage: 'Header actions',
    }),
  };

  const handleSelectEvaluators = () => {
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const handleEvaluatorsConfirm = async (evaluators: Evaluator[]) => {
    const selectedEvaluatorsConfig: EvaluatorConfig[] = evaluators.map((evaluator) => ({
      evaluatorId: evaluator.id as any,
      customInstructions: evaluator.customInstructions || '',
    }));
    await runEvaluations(selectedEvaluatorsConfig);
    setIsModalOpen(false);
  };

  return (
    <EuiPageHeaderSection css={actionsContainerStyles} aria-label={labels.container}>
      <EuiButton size="m" onClick={handleSelectEvaluators}>
        {i18n.translate('xpack.onechat.evaluations.selectEvaluators', {
          defaultMessage: 'Select Evaluators',
        })}
      </EuiButton>
      <EvaluatorSelectionModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onConfirm={handleEvaluatorsConfirm}
      />
    </EuiPageHeaderSection>
  );
};
