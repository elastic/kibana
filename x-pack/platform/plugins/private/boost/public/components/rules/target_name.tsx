/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import {
  EuiIcon,
  EuiMark,
  EuiScreenReaderOnly,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { splitByIndexPattern } from '../../../common/resolution';
import type { DataSourceType } from '../../../common/types';
import { DetailsLink } from '../details_link';
import { HiddenBadge } from '../hidden_data';
import { IndexManagementLink } from '../index_management_link';

/** Marks a rule that ranks higher than another, so it applies instead. */
const SUPERSEDING_ICON = 'sortAscending';

const SUPERSEDING_LABEL = i18n.translate('xpack.boost.targetName.supersedingLabel', {
  defaultMessage: 'Higher-ranked rule',
});

interface TargetNameProps {
  name: string;
  /** The index pattern that matched this target, whose spelled-out parts are highlighted. */
  pattern?: string;
  /** A higher-ranked rule that applies to this target instead. */
  supersededBy?: string;
  /**
   * Links the name to the index's or data stream's details in Index Management, outside forms that
   * would lose their changes.
   */
  linkedAs?: DataSourceType;
  /** Marks a hidden index or data stream with a badge. */
  isHidden?: boolean;
}

/**
 * A target's name, struck through and disabled when a higher-ranked rule applies to it instead, since
 * the rule targets it but doesn't apply.
 */
export const TargetName = ({
  name,
  pattern,
  supersededBy,
  linkedAs,
  isHidden = false,
}: TargetNameProps) => {
  const { euiTheme } = useEuiTheme();
  // A disabled name's highlight and link are disabled too.
  const inheritsColor = supersededBy ? { color: 'inherit' } : undefined;

  const text =
    pattern === undefined
      ? name
      : splitByIndexPattern(pattern, name).map(({ text: part, isLiteral }, index) => (
          <Fragment key={index}>
            {/* The name already says what matched, so screen readers skip the highlights. */}
            {isLiteral ? (
              <EuiMark hasScreenReaderHelpText={false} css={inheritsColor}>
                {part}
              </EuiMark>
            ) : (
              part
            )}
          </Fragment>
        ));

  const nameElement = (
    <span
      css={
        supersededBy
          ? { textDecoration: 'line-through', color: euiTheme.colors.textDisabled }
          : undefined
      }
      data-test-subj={supersededBy ? 'boostSupersededTarget' : undefined}
    >
      {linkedAs ? (
        <IndexManagementLink type={linkedAs} name={name} css={inheritsColor}>
          {text}
        </IndexManagementLink>
      ) : (
        text
      )}
    </span>
  );

  // One element, so the badge stays beside the name in a flex box, such as a table cell.
  return isHidden ? (
    <span
      css={{
        display: 'inline-flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: euiTheme.size.s,
      }}
    >
      {nameElement}
      <HiddenBadge />
    </span>
  ) : (
    nameElement
  );
};

/** Why a higher-ranked rule applies to a target instead, and how to outrank it. */
export const getSupersedingDescription = (rule: string): string =>
  i18n.translate('xpack.boost.targetName.supersedingDescription', {
    defaultMessage:
      '"{rule}" ranks higher, so it applies instead. To outrank it, increase this rule\'s priority.',
    values: { rule },
  });

interface SupersedingRuleProps {
  rule: string;
  /**
   * Explains the icon in a tooltip. Without one, such as inside a list option, which can't hold
   * focusable content and shows the explanation in its own tooltip, screen readers get the icon's
   * meaning as text instead.
   */
  hasTooltip?: boolean;
  /** Links the rule's name to its details page, outside forms that would lose their changes. */
  isLinked?: boolean;
}

/** The rule that applies to a target instead, after an icon for ranking higher. */
export const SupersedingRule = ({
  rule,
  hasTooltip = true,
  isLinked = false,
}: SupersedingRuleProps) => {
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
      {isLinked ? <DetailsLink kind="rule" name={rule} /> : rule}
    </span>
  );

  // The tooltip covers the icon and the rule's name, so hovering either explains it.
  return hasTooltip ? (
    <EuiToolTip id={tooltipId} content={getSupersedingDescription(rule)}>
      {label}
    </EuiToolTip>
  ) : (
    label
  );
};
