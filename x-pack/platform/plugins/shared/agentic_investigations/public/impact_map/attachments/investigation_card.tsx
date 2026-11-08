/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiAccordion,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';

export interface InvestigationCardProps {
  title: string;
  icon: string;
  /** The icon's colour; plain when absent. */
  iconColor?: string;
  /** Badges next to the title: type, sub-type, counts. */
  badges?: React.ReactNode;
  /** One short line under the title. */
  subtitle?: string;
  /** Opens what the card stands for, from an explicit Open button. Without it the card is plain. */
  onClick?: () => void;
  'data-test-subj'?: string;
  children?: React.ReactNode;
}

const OPEN = i18n.translate('xpack.agenticInvestigations.investigationCard.open', {
  defaultMessage: 'Open',
});

/**
 * A card for one thing an investigation found, with three separate controls, as an EUI accordion
 * and its extra action have them: the arrow at the start and the title fold the body, and the Open
 * button at the end opens what the card stands for. Clicking the body does neither.
 */
export const InvestigationCard: React.FC<InvestigationCardProps> = ({
  title,
  icon,
  iconColor,
  badges,
  subtitle,
  onClick,
  children,
  'data-test-subj': dataTestSubj,
}) => {
  const { euiTheme } = useEuiTheme();
  const subj = dataTestSubj ?? 'agenticInvestigationsCard';
  const accordionId = useGeneratedHtmlId({ prefix: 'investigationCard' });
  const [isOpen, setIsOpen] = useState(true);
  const heading = (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiIcon type={icon} color={iconColor} aria-hidden={true} />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiTitle size="xs">
          <h4>{title}</h4>
        </EuiTitle>
      </EuiFlexItem>
      {badges && (
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs" responsive={false} wrap>
            {badges}
          </EuiFlexGroup>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
  const openButton = onClick && (
    <EuiButtonEmpty
      size="xs"
      iconType="maximize"
      iconSide="right"
      aria-label={i18n.translate('xpack.agenticInvestigations.investigationCard.openLabel', {
        defaultMessage: 'Open {title}',
        values: { title },
      })}
      onClick={onClick}
      data-test-subj={`${subj}Open`}
    >
      {OPEN}
    </EuiButtonEmpty>
  );
  // Lines up under the title, not under its icon, and stops at two lines so a long one cannot
  // push the card around.
  const subtitleText = subtitle && (
    <EuiText
      size="xs"
      color="subdued"
      css={css`
        margin-left: ${euiTheme.size.l};
        text-align: left;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      `}
    >
      <p title={subtitle}>{subtitle}</p>
    </EuiText>
  );

  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="m" borderRadius="m" data-test-subj={subj}>
      {children ? (
        <EuiAccordion
          id={accordionId}
          arrowDisplay="left"
          forceState={isOpen ? 'open' : 'closed'}
          onToggle={setIsOpen}
          buttonContent={
            <>
              {heading}
              {subtitleText}
            </>
          }
          extraAction={openButton}
          paddingSize="none"
          buttonProps={{ 'data-test-subj': `${subj}Collapse` }}
        >
          {isOpen && children}
        </EuiAccordion>
      ) : (
        <>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem>{heading}</EuiFlexItem>
            {openButton && <EuiFlexItem grow={false}>{openButton}</EuiFlexItem>}
          </EuiFlexGroup>
          {subtitleText}
        </>
      )}
    </EuiPanel>
  );
};
