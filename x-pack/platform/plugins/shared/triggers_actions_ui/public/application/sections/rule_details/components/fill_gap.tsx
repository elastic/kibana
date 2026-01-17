/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiButtonEmpty, EuiToolTip } from '@elastic/eui';
import { gapStatus } from '@kbn/alerting-plugin/common';
import type { Gap } from '../../../lib/rule_api/load_gaps';
import { useFillGaps } from '../../../hooks/use_fill_gaps';

export const FillGap = ({ ruleId, gap }: { ruleId: string; gap: Gap }) => {
  const isGapFillAvailable = gap.status !== gapStatus.FILLED && gap.unfilled_intervals.length !== 0;

  const hasRemainingGaps =
    isGapFillAvailable && (gap.in_progress_intervals.length > 0 || gap.filled_intervals.length > 0);

  const { mutate } = useFillGaps();

  if (!isGapFillAvailable) {
    return null;
  }

  const title = hasRemainingGaps ? 'Fill remaining gap' : 'Fill gap';

  const onFillAction = () => {
    mutate({ ruleId, gapId: gap._id });
  };

  return (
    <>
      <EuiToolTip
        position="top"
        content={''}
        display="block"
        data-test-subj="rule-gaps-fill-gap-tooltip"
      >
        <EuiButtonEmpty
          // isLoading={fillGapMutation.isLoading}
          // isDisabled={fillGapMutation.isLoading || !isRuleEnabled}
          size="s"
          color="primary"
          data-test-subj="rule-gaps-fill-gap-button"
          onClick={onFillAction}
        >
          {title}
        </EuiButtonEmpty>
      </EuiToolTip>
    </>
  );
};
