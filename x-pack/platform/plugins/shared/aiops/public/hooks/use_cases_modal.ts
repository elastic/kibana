/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { stringHash } from '@kbn/ml-string-hash';
import { AttachmentType } from '@kbn/cases-plugin/common';
import { i18n } from '@kbn/i18n';
import {
  CASES_ATTACHMENT_CHANGE_POINT_CHART,
  EMBEDDABLE_CHANGE_POINT_CHART_TYPE,
} from '@kbn/aiops-change-point-detection/constants';
import {
  CASES_ATTACHMENT_LOG_PATTERN,
  EMBEDDABLE_PATTERN_ANALYSIS_TYPE,
} from '@kbn/aiops-log-pattern-analysis/constants';
import {
  CASES_ATTACHMENT_LOG_RATE_ANALYSIS,
  EMBEDDABLE_LOG_RATE_ANALYSIS_TYPE,
} from '@kbn/aiops-log-rate-analysis/constants';
import type { ChangePointEmbeddableState } from '../../common/embeddables/change_point_chart/types';
import type { EmbeddableChangePointChartType } from '../embeddables/change_point_chart/embeddable_change_point_chart_factory';
import { useAiopsAppContext } from './use_aiops_app_context';
import type { EmbeddablePatternAnalysisType } from '../embeddables/pattern_analysis/embeddable_pattern_analysis_factory';
import type { EmbeddableLogRateAnalysisType } from '../embeddables/log_rate_analysis/embeddable_log_rate_analysis_factory';
import type { LogRateAnalysisEmbeddableState } from '../../common/embeddables/log_rate_analysis/types';
import type { PatternAnalysisEmbeddableState } from '../../common/embeddables/pattern_analysis/types';

type SupportedEmbeddableTypes =
  | EmbeddableChangePointChartType
  | EmbeddablePatternAnalysisType
  | EmbeddableLogRateAnalysisType;

type EmbeddableRuntimeState<T extends SupportedEmbeddableTypes> =
  T extends EmbeddableChangePointChartType
    ? ChangePointEmbeddableState
    : T extends EmbeddablePatternAnalysisType
    ? PatternAnalysisEmbeddableState
    : T extends EmbeddableLogRateAnalysisType
    ? LogRateAnalysisEmbeddableState
    : never;

const attachmentTypeByEmbeddableType: Record<SupportedEmbeddableTypes, string> = {
  [EMBEDDABLE_CHANGE_POINT_CHART_TYPE]: CASES_ATTACHMENT_CHANGE_POINT_CHART,
  [EMBEDDABLE_PATTERN_ANALYSIS_TYPE]: CASES_ATTACHMENT_LOG_PATTERN,
  [EMBEDDABLE_LOG_RATE_ANALYSIS_TYPE]: CASES_ATTACHMENT_LOG_RATE_ANALYSIS,
};

/**
 * Returns a callback for opening the cases modal with provided attachment state.
 */
export const useCasesModal = <EmbeddableType extends SupportedEmbeddableTypes>(
  embeddableType: EmbeddableType,
  title: string
) => {
  const { cases } = useAiopsAppContext();

  const successMessage = useMemo(() => {
    return i18n.translate('xpack.aiops.useCasesModal.successMessage', {
      defaultMessage: '{title} added to case.',
      values: { title },
    });
  }, [title]);

  const selectCaseModal = cases?.hooks.useCasesAddToExistingCaseModal({
    successToaster: {
      content: successMessage,
    },
  });

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
            persistableStateAttachmentTypeId: attachmentTypeByEmbeddableType[embeddableType],
            persistableStateAttachmentState: JSON.parse(
              JSON.stringify(persistableStateAttachmentState)
            ),
          },
        ],
      });
    },
    [embeddableType, selectCaseModal]
  );
};
