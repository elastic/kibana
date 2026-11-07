/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import type { CaseUI } from '../../../../../common';
import { caseViewSectionRegistry } from '../../../../client/case_view_sections';
import { useCasesConfig } from '../../../../common/lib/kibana';
import { useCasesContext } from '../../../cases_context/use_cases_context';
import { useRefreshCaseViewPage } from '../../use_on_refresh_case_view_page';
import { VerdictBadge } from '../../../verdict/verdict_badge';
import * as i18n from '../../../verdict/translations';
import { PriorOutcomes } from './prior_outcomes';

export const useShowVerdictSection = (caseData: CaseUI): boolean => {
  const { agenticEnabled } = useCasesConfig();
  return (
    agenticEnabled &&
    (caseData.aiVerdict != null ||
      caseData.humanVerdict != null ||
      caseViewSectionRegistry.getVisible('sidebar', caseData).length > 0)
  );
};

/**
 * The case outcome at a glance: what the agent concluded, what the analyst decided at close, and
 * whether they agree. Plugins add their own lines under it (linked investigations and pending
 * proposals).
 */
export const VerdictSection: React.FC<{ caseData: CaseUI }> = ({ caseData }) => {
  const { aiVerdict, humanVerdict } = caseData;
  const { permissions } = useCasesContext();
  const refreshCase = useRefreshCaseViewPage();
  const extensions = caseViewSectionRegistry.getVisible('sidebar', caseData);
  const agreement =
    aiVerdict != null && humanVerdict != null
      ? aiVerdict.verdict === humanVerdict
        ? 'agrees'
        : 'differs'
      : undefined;

  return (
    <div data-test-subj="case-view-verdict-section">
      <EuiDescriptionList
        compressed
        type="column"
        columnWidths={[2, 3]}
        listItems={[
          {
            title: i18n.AI_VERDICT,
            description:
              aiVerdict != null ? (
                <EuiToolTip
                  content={
                    aiVerdict.actor?.name ? i18n.aiVerdictSetBy(aiVerdict.actor.name) : undefined
                  }
                >
                  <VerdictBadge
                    verdict={aiVerdict.verdict}
                    confidence={aiVerdict.confidence}
                    data-test-subj="case-view-ai-verdict"
                  />
                </EuiToolTip>
              ) : (
                <EuiText size="s" color="subdued" data-test-subj="case-view-ai-verdict-empty">
                  {i18n.AI_VERDICT_EMPTY}
                </EuiText>
              ),
          },
          {
            title: i18n.HUMAN_VERDICT,
            description:
              humanVerdict != null ? (
                <EuiFlexGroup gutterSize="s" alignItems="center" wrap responsive={false}>
                  <EuiFlexItem grow={false}>
                    <VerdictBadge verdict={humanVerdict} data-test-subj="case-view-human-verdict" />
                  </EuiFlexItem>
                  {agreement ? (
                    <EuiFlexItem grow={false}>
                      <EuiText
                        size="xs"
                        color="subdued"
                        data-test-subj="case-view-verdict-agreement"
                      >
                        <EuiIcon
                          type={agreement === 'agrees' ? 'check' : 'cross'}
                          size="s"
                          aria-hidden={true}
                        />{' '}
                        {agreement === 'agrees' ? i18n.AGREES : i18n.DIFFERS}
                      </EuiText>
                    </EuiFlexItem>
                  ) : null}
                </EuiFlexGroup>
              ) : (
                <EuiText size="s" color="subdued" data-test-subj="case-view-human-verdict-empty">
                  {i18n.HUMAN_VERDICT_EMPTY}
                </EuiText>
              ),
          },
        ]}
      />
      {aiVerdict?.summary ? (
        <>
          <EuiSpacer size="xs" />
          <EuiText size="xs" color="subdued" data-test-subj="case-view-ai-verdict-summary">
            <p>{aiVerdict.summary}</p>
          </EuiText>
        </>
      ) : null}
      {extensions.map((section) => (
        <React.Fragment key={section.id}>
          <EuiSpacer size="s" />
          {section.render({ caseData, canUpdate: permissions.update, refreshCase })}
        </React.Fragment>
      ))}
      <EuiSpacer size="s" />
      <PriorOutcomes caseData={caseData} />
    </div>
  );
};
VerdictSection.displayName = 'VerdictSection';
