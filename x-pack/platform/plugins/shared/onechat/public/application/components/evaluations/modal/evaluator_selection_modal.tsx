/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { EvaluatorList } from './evaluator_list';
import { EvaluatorDetails } from './evaluator_details';
import { SelectionSummary } from './selection_summary';
import type { Evaluator } from './types';
import { useEvaluationsData } from '../hooks/use_evaluations_data';

interface EvaluatorSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedEvaluators: Evaluator[]) => Promise<void>;
}

export const EvaluatorSelectionModal: React.FC<EvaluatorSelectionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const { euiTheme } = useEuiTheme();
  const { evaluators: availableEvaluators } = useEvaluationsData();

  const [selectedEvaluators, setSelectedEvaluators] = useState<Evaluator[]>([]);
  const [selectedEvaluator, setSelectedEvaluator] = useState<Evaluator | null>(null);
  const [customInstructions, setCustomInstructions] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleEvaluatorSelect = (evaluator: Evaluator) => {
    setSelectedEvaluator(evaluator);
  };

  const handleEvaluatorToggle = (evaluator: Evaluator, isSelected: boolean) => {
    if (isSelected) {
      setSelectedEvaluators((prev) => [...prev, evaluator]);
    } else {
      setSelectedEvaluators((prev) => prev.filter((e) => e.id !== evaluator.id));
      setCustomInstructions((prev) => {
        const newInstructions = { ...prev };
        delete newInstructions[evaluator.id];
        return newInstructions;
      });
    }
  };

  const handleInstructionsChange = (evaluatorId: string, instructions: string) => {
    setCustomInstructions((prev) => ({
      ...prev,
      [evaluatorId]: instructions,
    }));
  };

  const handleConfirm = async () => {
    const evaluatorsWithInstructions = selectedEvaluators.map((evaluator) => ({
      ...evaluator,
      customInstructions: customInstructions[evaluator.id] || undefined,
    }));
    setIsLoading(true);
    await onConfirm(evaluatorsWithInstructions);
    setIsLoading(false);
    onClose();
  };

  const handleClose = () => {
    setSelectedEvaluators([]);
    setSelectedEvaluator(null);
    setCustomInstructions({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <EuiModal
      aria-label="Evaluator Selection Modal"
      onClose={handleClose}
      maxWidth={1200}
      style={{
        width: '1200px',
      }}
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          {i18n.translate('xpack.onechat.evaluations.selectEvaluators', {
            defaultMessage: 'Select Evaluators',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <>
          <EuiFlexGroup gutterSize="l">
            <EuiFlexItem grow={2}>
              <EvaluatorList
                evaluators={availableEvaluators || []}
                selectedEvaluators={selectedEvaluators}
                selectedEvaluator={selectedEvaluator}
                onEvaluatorSelect={handleEvaluatorSelect}
                onEvaluatorToggle={handleEvaluatorToggle}
              />
            </EuiFlexItem>

            <EuiFlexItem grow={2}>
              {selectedEvaluator ? (
                <EvaluatorDetails
                  evaluator={selectedEvaluator}
                  customInstructions={customInstructions[selectedEvaluator.id] || ''}
                  onInstructionsChange={(instructions) =>
                    handleInstructionsChange(selectedEvaluator.id, instructions)
                  }
                />
              ) : (
                <div
                  css={css`
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    color: ${euiTheme.colors.subduedText};
                  `}
                >
                  {i18n.translate('xpack.onechat.evaluations.selectEvaluatorToConfigure', {
                    defaultMessage: 'Select an evaluator to configure',
                  })}
                </div>
              )}
              <SelectionSummary selectedEvaluators={selectedEvaluators} />
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="l" />
        </>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty aria-label="Cancel" onClick={handleClose}>
          {i18n.translate('xpack.onechat.evaluations.cancel', {
            defaultMessage: 'Cancel',
          })}
        </EuiButtonEmpty>
        <EuiButton
          isLoading={isLoading}
          fill
          onClick={handleConfirm}
          disabled={selectedEvaluators.length === 0}
        >
          {i18n.translate('xpack.onechat.evaluations.confirmSelection', {
            defaultMessage: 'Confirm Selection',
          })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
