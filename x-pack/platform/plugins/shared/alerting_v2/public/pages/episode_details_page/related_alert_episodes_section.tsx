/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiAccordion, EuiSpacer, EuiText } from '@elastic/eui';
import type { RuleResponse } from '@kbn/alerting-v2-schemas';
import { css } from '@emotion/react';
import { RelatedEpisodesRuleSubsection } from './related_episodes_rule_subsection';
import { RelatedEpisodesGroupSubsection } from './related_episodes_group_subsection';
import * as i18n from './translations';

export interface RelatedAlertEpisodesSectionProps {
  currentEpisodeId: string | undefined;
  groupHash: string | undefined;
  rule: RuleResponse;
  ruleId: string | undefined;
}

export function RelatedAlertEpisodesSection({
  currentEpisodeId,
  groupHash,
  rule,
  ruleId,
}: RelatedAlertEpisodesSectionProps) {
  return (
    <EuiAccordion
      id="alertingV2RelatedAlertEpisodes"
      paddingSize="none"
      buttonProps={{
        paddingSize: 'm',
        css: css`
          .euiAccordion__buttonContent {
            width: 100%;
          }
        `,
      }}
      buttonContent={
        <EuiText>
          <h3>{i18n.RELATED_EPISODES_TITLE}</h3>
        </EuiText>
      }
      initialIsOpen
      data-test-subj="alertingV2RelatedAlertEpisodesAccordion"
    >
      <>
        {groupHash ? (
          <>
            <RelatedEpisodesGroupSubsection
              currentEpisodeId={currentEpisodeId}
              groupHash={groupHash}
              rule={rule}
              ruleId={ruleId}
            />
            <EuiSpacer size="l" />
          </>
        ) : null}
        <RelatedEpisodesRuleSubsection
          currentEpisodeId={currentEpisodeId}
          currentGroupHash={groupHash}
          rule={rule}
          ruleId={ruleId}
        />
      </>
    </EuiAccordion>
  );
}
