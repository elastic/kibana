/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiIcon,
  EuiScreenReaderOnly,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

/** Marks a rule that ranks higher than another, so it applies instead. */
const SUPERSEDING_ICON = 'sortAscending';

const SUPERSEDING_LABEL = i18n.translate('xpack.boost.targetName.supersedingLabel', {
  defaultMessage: 'Higher-ranked rule',
});

interface TargetNameProps {
  name: string;
  /** A higher-ranked rule that applies to this target instead. */
  supersededBy?: string;
}

/**
 * A target's name, struck through when a higher-ranked rule applies to it instead, since the rule
 * targets it but doesn't apply.
 */
export const TargetName = ({ name, supersededBy }: TargetNameProps) => (
  <span
    css={{ textDecoration: supersededBy ? 'line-through' : undefined }}
    data-test-subj={supersededBy ? 'boostSupersededTarget' : undefined}
  >
    {name}
  </span>
);

interface SupersedingRuleProps {
  rule: string;
  /**
   * Explains the icon in a tooltip. Without one, such as inside a list option, which can't hold
   * focusable content, screen readers get the explanation as text instead.
   */
  hasTooltip?: boolean;
}

/** The rule that applies to a target instead, after an icon for ranking higher. */
export const SupersedingRule = ({ rule, hasTooltip = true }: SupersedingRuleProps) => {
  const { euiTheme } = useEuiTheme();
  const tooltipId = useGeneratedHtmlId();

  const label = (
    <span
      css={{ display: 'inline-flex', alignItems: 'center', gap: euiTheme.size.xs }}
      data-test-subj="boostSupersedingRule"
    >
      {hasTooltip ? (
        // Focusable, so keyboard users can open the tooltip, which describes it.
        <EuiIcon
          type={SUPERSEDING_ICON}
          size="s"
          color="subdued"
          tabIndex={0}
          aria-label={SUPERSEDING_LABEL}
          aria-describedby={tooltipId}
        />
      ) : (
        <>
          <EuiIcon type={SUPERSEDING_ICON} size="s" color="subdued" aria-hidden={true} />
          <EuiScreenReaderOnly>
            <span>{`${SUPERSEDING_LABEL}: `}</span>
          </EuiScreenReaderOnly>
        </>
      )}
      {rule}
    </span>
  );

  // The tooltip covers the icon and the rule's name, so hovering either explains it.
  return hasTooltip ? (
    <EuiToolTip
      id={tooltipId}
      content={i18n.translate('xpack.boost.targetName.supersedingDescription', {
        defaultMessage: '"{rule}" ranks higher, so it applies instead.',
        values: { rule },
      })}
    >
      {label}
    </EuiToolTip>
  ) : (
    label
  );
};
