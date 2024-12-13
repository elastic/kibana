/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { stringHash } from '@kbn/ml-string-hash';
import { AttachmentType } from '@kbn/cases-plugin/common';
import type { ChangePointEmbeddableRuntimeState } from '../embeddables/change_point_chart/types';
import type { EmbeddableChangePointChartType } from '../embeddables/change_point_chart/embeddable_change_point_chart_factory';
import { useAiopsAppContext } from './use_aiops_app_context';
import type { EmbeddablePatternAnalysisType } from '../embeddables/pattern_analysis/embeddable_pattern_analysis_factory';
import type { PatternAnalysisEmbeddableRuntimeState } from '../embeddables/pattern_analysis/types';
import type { EmbeddableLogRateAnalysisType } from '../embeddables/log_rate_analysis/embeddable_log_rate_analysis_factory';
import type { LogRateAnalysisEmbeddableRuntimeState } from '../embeddables/log_rate_analysis/types';

type SupportedEmbeddableTypes =
  | EmbeddableChangePointChartType
  | EmbeddablePatternAnalysisType
  | EmbeddableLogRateAnalysisType;

type EmbeddableRuntimeState<T extends SupportedEmbeddableTypes> =
  T extends EmbeddableChangePointChartType
    ? ChangePointEmbeddableRuntimeState
    : T extends EmbeddablePatternAnalysisType
    ? PatternAnalysisEmbeddableRuntimeState
    : T extends EmbeddableLogRateAnalysisType
    ? LogRateAnalysisEmbeddableRuntimeState
    : never;

/**
 * Returns a callback for opening the cases modal with provided attachment state.
 */
export const useCasesModal = <EmbeddableType extends SupportedEmbeddableTypes>(
  embeddableType: EmbeddableType
) => {
  const { cases } = useAiopsAppContext();

  const selectCaseModal = cases?.hooks.useCasesAddToExistingCaseModal();

  return useCallback(
    (persistableState: Partial<Omit<EmbeddableRuntimeState<EmbeddableType>, 'id'>>) => {
      const persistableStateAttachmentState = {
        ...persistableState,
        // Creates unique id based on the input
        id: stringHash(JSON.stringify(persistableState)).toString(),
      };

      if (!selectCaseModal) {
        throw new Error('Cases modal is not available');
      }

      selectCaseModal.open({
        getAttachments: () => [
          {
            type: AttachmentType.persistableState,
            persistableStateAttachmentTypeId: embeddableType,
            persistableStateAttachmentState: JSON.parse(
              JSON.stringify(persistableStateAttachmentState)
            ),
          },
        ],
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [embeddableType]
  );
};
