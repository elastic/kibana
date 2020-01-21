/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';

import { EuiCallOut, EuiButton } from '@elastic/eui';
import * as i18n from './translations';

interface UpdatePrePackagedRulesCallOutProps {
  numberOfUpdatedRules: number;
  updateRules: () => void;
}

const UpdatePrePackagedRulesCallOutComponent: React.FC<UpdatePrePackagedRulesCallOutProps> = ({
  numberOfUpdatedRules,
  updateRules,
}) => (
  <EuiCallOut size="s" title={i18n.UPDATE_PREPACKAGED_RULES_TITLE}>
    <p>{i18n.UPDATE_PREPACKAGED_RULES_MSG(numberOfUpdatedRules)}</p>
    <EuiButton onClick={updateRules} size="s">
      {i18n.UPDATE_PREPACKAGED_RULES(numberOfUpdatedRules)}
    </EuiButton>
  </EuiCallOut>
);

export const UpdatePrePackagedRulesCallOut = memo(UpdatePrePackagedRulesCallOutComponent);
