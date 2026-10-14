/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCode, EuiScreenReaderOnly } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

/** Names the rule that applies to a target instead of the one targeting it. */
export const getHigherRankedRuleLabel = (rule: string): string =>
  i18n.translate('xpack.boost.targetName.higherRankedRule', {
    defaultMessage: 'Higher-ranked rule: {rule}',
    values: { rule },
  });

interface TargetNameProps {
  name: string;
  /** A higher-ranked rule that applies to this target instead. */
  supersededBy?: string;
  /** Says which rule applies instead, for screen readers, where it isn't shown beside the name. */
  describeSuperseding?: boolean;
}

/**
 * A target's name, struck through when a higher-ranked rule applies to it instead, since the rule
 * targets it but doesn't apply.
 */
export const TargetName = ({ name, supersededBy, describeSuperseding }: TargetNameProps) => (
  <>
    {/* Names wrap between each other, not at their hyphens. */}
    <EuiCode
      css={{ whiteSpace: 'nowrap', textDecoration: supersededBy ? 'line-through' : undefined }}
      data-test-subj={supersededBy ? 'boostSupersededTarget' : undefined}
    >
      {name}
    </EuiCode>
    {supersededBy && describeSuperseding && (
      <EuiScreenReaderOnly>
        <span>{` (${getHigherRankedRuleLabel(supersededBy)})`}</span>
      </EuiScreenReaderOnly>
    )}
  </>
);
