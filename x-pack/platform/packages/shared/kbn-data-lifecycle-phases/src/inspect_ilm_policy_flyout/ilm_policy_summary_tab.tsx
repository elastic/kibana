/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { Phases } from '@kbn/index-lifecycle-management-common-shared';
import { PHASE_TITLES, PHASE_ORDER, usePhaseColors } from '../phases';
import type { IlmPhase } from '../phases';
import { buildPhaseContent } from './phase_content';
import type { Section } from './phase_content';

const sectionRowsKey = (rows: Section['rows']) => rows.map((r) => r.label).join('|');

const SectionGroup = ({ section, rows }: Section) => (
  <EuiFlexGroup direction="column" gutterSize="s">
    {section && (
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued">
          {section}
        </EuiText>
      </EuiFlexItem>
    )}
    {rows.map(({ label, value }) => (
      <EuiFlexItem key={label} grow={false}>
        <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
          <EuiFlexItem>
            <EuiText size="s">
              <strong>{label}</strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s" color="subdued">
              {value}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    ))}
  </EuiFlexGroup>
);

const PhaseIndicator = ({ phase }: { phase: IlmPhase }) => {
  const phaseColors = usePhaseColors();
  if (phase === 'delete') return <EuiIcon type="trash" size="m" aria-hidden />;
  return <EuiIcon type="dot" color={phaseColors[phase]} size="m" aria-hidden />;
};

interface PhaseAccordionProps {
  phase: IlmPhase;
  phases: Phases;
}

export const PhaseAccordion = ({ phase, phases }: PhaseAccordionProps) => {
  const { euiTheme } = useEuiTheme();
  const [isOpen, setIsOpen] = React.useState(false);
  const minAge = phases[phase]?.min_age;
  const content = buildPhaseContent(phase, phases);
  const accordionContentStyles = css`
    padding: 0 ${euiTheme.size.l} ${euiTheme.size.base} ${euiTheme.size.xxxl};
  `;

  const accordionButtonStyles = css`
    .euiAccordion__buttonContent {
      inline-size: 100%;
    }
  `;

  const toggleIconCss = css`
    transform: ${isOpen ? 'rotate(180deg)' : 'rotate(0deg)'};
    transition: transform 150ms ease-in-out;
  `;

  const buttonContent = (
    <EuiFlexGroup
      gutterSize="s"
      alignItems="center"
      responsive={false}
      data-test-subj={`ilmInspectPhaseAccordionButton-${phase}`}
    >
      <EuiFlexItem grow={false}>
        <PhaseIndicator phase={phase} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiTitle size="xxs" css={{ fontWeight: euiTheme.font.weight.bold }}>
          <h3>{PHASE_TITLES[phase]}</h3>
        </EuiTitle>
      </EuiFlexItem>
      {minAge && minAge !== '0ms' && (
        <EuiFlexItem grow={false}>
          <EuiBadge data-test-subj={`ilmInspectPhaseMinAgeBadge-${phase}`}>{minAge}</EuiBadge>
        </EuiFlexItem>
      )}
      <EuiFlexItem />
      <EuiFlexItem grow={false}>
        <EuiIcon
          type="arrowDown"
          size="m"
          aria-hidden
          css={toggleIconCss}
          data-test-subj={`ilmInspectPhaseAccordionToggleIcon-${phase}`}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <>
      <EuiAccordion
        id={`ilm-inspect-phase-${phase}`}
        data-test-subj={`ilmInspectPhaseAccordion-${phase}`}
        buttonContent={buttonContent}
        forceState={isOpen ? 'open' : 'closed'}
        onToggle={setIsOpen}
        paddingSize="none"
        arrowDisplay="none"
        buttonProps={{ paddingSize: 'l', css: accordionButtonStyles }}
      >
        {content.length > 0 && (
          <EuiFlexGroup
            direction="column"
            gutterSize="m"
            data-test-subj={`ilmInspectPhaseAccordionContent-${phase}`}
            css={accordionContentStyles}
          >
            {content.map((section) => (
              <EuiFlexItem key={section.section ?? sectionRowsKey(section.rows)} grow={false}>
                <SectionGroup section={section.section} rows={section.rows} />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        )}
      </EuiAccordion>
      <EuiHorizontalRule margin="none" />
    </>
  );
};

export interface IlmPolicySummaryTabProps {
  phases: Phases;
}

export const IlmPolicySummaryTab = ({ phases }: IlmPolicySummaryTabProps) => {
  const presentPhases = PHASE_ORDER.filter((p) => phases[p] !== undefined);

  return (
    <>
      {presentPhases.map((phase) => (
        <PhaseAccordion key={phase} phase={phase} phases={phases} />
      ))}
    </>
  );
};
