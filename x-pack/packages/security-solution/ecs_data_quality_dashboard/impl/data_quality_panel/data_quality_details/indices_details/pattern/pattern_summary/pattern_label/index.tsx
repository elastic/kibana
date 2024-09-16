/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiTitle, EuiToolTip, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';

import type { IlmExplainPhaseCounts } from '../../../../../types';
import { IndexResultBadge } from '../../index_result_badge';
import * as i18n from '../translations';
import { IlmPhaseCounts } from './ilm_phase_counts';
import { getPatternResultTooltip } from './utils/get_pattern_result_tooltip';
import { showResult } from './utils/show_result';

interface Props {
  incompatible: number | undefined;
  indices: number | undefined;
  indicesChecked: number | undefined;
  ilmExplainPhaseCounts: IlmExplainPhaseCounts | undefined;
  pattern: string;
}

const PatternLabelComponent: React.FC<Props> = ({
  ilmExplainPhaseCounts,
  incompatible,
  indices,
  indicesChecked,
  pattern,
}) => {
  // this is a workaround for type guard limitation
  // TS does not type narrow value passed to the type guard function
  // if that value is proxied via another key like for example {incompatible: *incompatible*}
  // so we need a reference object to pass it to the type guard
  // and then check the keys of that object (resultOpts) for type guarded result
  // to be properly type narrowed instead
  const resultOpts = {
    incompatible,
    indices,
    indicesChecked,
  };

  return (
    <EuiFlexGroup gutterSize={'s'} alignItems={'center'}>
      {showResult(resultOpts) && (
        <EuiFlexItem grow={false}>
          <IndexResultBadge
            incompatible={resultOpts.incompatible}
            tooltipText={getPatternResultTooltip(resultOpts.incompatible)}
          />
        </EuiFlexItem>
      )}

      <EuiFlexItem grow={false}>
        <EuiToolTip content={i18n.PATTERN_OR_INDEX_TOOLTIP}>
          <EuiTitle size="xxs">
            <h2>{pattern}</h2>
          </EuiTitle>
        </EuiToolTip>
      </EuiFlexItem>

      {ilmExplainPhaseCounts && (
        <EuiFlexItem grow={false}>
          <IlmPhaseCounts ilmExplainPhaseCounts={ilmExplainPhaseCounts} pattern={pattern} />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

PatternLabelComponent.displayName = 'PatternLabelComponent';

export const PatternLabel = React.memo(PatternLabelComponent);
