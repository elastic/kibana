/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Reusable accordion panel used by all three deployment sections:
 *   - ManagedIntegrationsSection
 *   - EcfDeploymentSection
 *   - AgentBasedSection
 *
 * Extracts the byte-identical headerButtonCss + header row pattern that was previously
 * duplicated in managed_integrations_section.tsx and ecf_deployment_section.tsx.
 */

import React, { useEffect, useRef, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export interface DeploymentSectionAccordionProps {
  /** EUI icon type for the section header */
  icon: string;
  /** Localised title string */
  title: string;
  /** Service count label rendered as subdued text next to the title */
  serviceCount: number;
  /** When true the Done badge is shown. When autoCollapse is also true, the accordion collapses. */
  isDone: boolean;
  /** When false, the Done badge shows but the accordion does not auto-collapse. Default true. */
  autoCollapse?: boolean;
  /** data-test-subj on the outer EuiPanel */
  dataTestSubj: string;
  /** data-test-subj on the header button */
  headerButtonTestSubj: string;
  children: React.ReactNode;
}

export function DeploymentSectionAccordion({
  icon,
  title,
  serviceCount,
  isDone,
  autoCollapse = true,
  dataTestSubj,
  headerButtonTestSubj,
  children,
}: DeploymentSectionAccordionProps) {
  const { euiTheme } = useEuiTheme();
  const contentId = useGeneratedHtmlId({ prefix: 'sectionAccordionContent' });
  // Start open always. Auto-collapse only when isDone transitions false → true in this session
  // (i.e. the deploy just completed). When the component mounts already-done (session storage
  // retained from a previous run), stay open so the user can still see and interact with the
  // section content (e.g. the "Add agent" button in AgentBasedSection).
  const [isOpen, setIsOpen] = useState(true);
  const prevIsDoneRef = useRef(isDone);
  useEffect(() => {
    if (autoCollapse && isDone && !prevIsDoneRef.current) {
      setIsOpen(false);
    }
    prevIsDoneRef.current = isDone;
  }, [autoCollapse, isDone]);

  const headerButtonCss = css`
    display: block;
    width: 100%;
    text-align: left;
    background-color: ${euiTheme.colors.backgroundBaseSubdued};
    border: none;
    padding: ${euiTheme.size.l} ${euiTheme.size.m};
    cursor: pointer;
    border-bottom: ${isOpen ? `1px solid ${euiTheme.colors.borderBaseSubdued}` : 'none'};
  `;

  return (
    <EuiPanel
      hasBorder
      paddingSize="none"
      style={{ overflow: 'hidden', borderColor: euiTheme.colors.borderBaseSubdued }}
      data-test-subj={dataTestSubj}
    >
      <button
        type="button"
        css={headerButtonCss}
        aria-expanded={isOpen}
        aria-controls={contentId}
        onClick={() => setIsOpen((v) => !v)}
        data-test-subj={headerButtonTestSubj}
      >
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type={icon} size="m" color="subdued" aria-hidden />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <strong>{title}</strong>
            </EuiText>
          </EuiFlexItem>
          {isDone && (
            <EuiFlexItem grow={false}>
              <EuiBadge color="success" iconType="check">
                <FormattedMessage
                  id="xpack.ingestHub.authenticateAndDeployStep.sectionAccordion.doneBadge"
                  defaultMessage="Done"
                />
              </EuiBadge>
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued">
              <FormattedMessage
                id="xpack.ingestHub.authenticateAndDeployStep.sectionAccordion.serviceCount"
                defaultMessage="{count, plural, one {# service} other {# services}}"
                values={{ count: serviceCount }}
              />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </button>

      {isOpen && (
        <div id={contentId} role="region">
          {children}
        </div>
      )}
    </EuiPanel>
  );
}
