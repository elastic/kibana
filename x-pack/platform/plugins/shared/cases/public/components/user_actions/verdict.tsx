/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { SnakeToCamelCase } from '../../../common/types';
import type { AiVerdictUserAction, HumanVerdictUserAction } from '../../../common/types/domain';
import type { UserActionBuilder } from './types';
import { createCommonUpdateUserActionBuilder } from './common';
import { VerdictBadge } from '../verdict/verdict_badge';
import * as i18n from './translations';

const VerdictLabel: React.FC<{
  prefix: string;
  cleared: string;
  verdict: React.ComponentProps<typeof VerdictBadge>['verdict'] | null | undefined;
  confidence?: number | null;
}> = ({ prefix, cleared, verdict, confidence }) =>
  verdict == null ? (
    <>{cleared}</>
  ) : (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>{prefix}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <VerdictBadge verdict={verdict} confidence={confidence} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
VerdictLabel.displayName = 'VerdictLabel';

export const createAiVerdictUserActionBuilder: UserActionBuilder = ({
  userAction,
  userProfiles,
  handleOutlineComment,
}) => ({
  build: () => {
    const action = userAction as SnakeToCamelCase<AiVerdictUserAction>;
    const aiVerdict = action.payload.aiVerdict;
    return createCommonUpdateUserActionBuilder({
      userAction,
      userProfiles,
      handleOutlineComment,
      label: (
        <VerdictLabel
          prefix={i18n.SET_AI_VERDICT}
          cleared={i18n.CLEARED_AI_VERDICT}
          verdict={aiVerdict?.verdict}
          confidence={aiVerdict?.confidence}
        />
      ),
      icon: 'dot',
    }).build();
  },
});

export const createHumanVerdictUserActionBuilder: UserActionBuilder = ({
  userAction,
  userProfiles,
  handleOutlineComment,
}) => ({
  build: () => {
    const action = userAction as SnakeToCamelCase<HumanVerdictUserAction>;
    return createCommonUpdateUserActionBuilder({
      userAction,
      userProfiles,
      handleOutlineComment,
      label: (
        <VerdictLabel
          prefix={i18n.SET_HUMAN_VERDICT}
          cleared={i18n.CLEARED_HUMAN_VERDICT}
          verdict={action.payload.humanVerdict}
        />
      ),
      icon: 'dot',
    }).build();
  },
});
