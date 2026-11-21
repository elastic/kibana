/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiDescriptionList } from '@elastic/eui';
import type { InvestigationRecord } from '../../../../common/investigations/types';
import { ICONS } from '../../icons';
import { useConversationMessageCount } from '../conversation/use_conversation';
import type { TabId } from '../tabs/tab_props';
import { SideCard } from './side_card';
import * as i18n from './translations';

export interface AtAGlanceCardProps {
  record: InvestigationRecord;
  onNavigateTab: (tab: TabId) => void;
}

/**
 * Messages in the record's discussion: the main agent conversation for AI records, otherwise the
 * comment counter (team discussion).
 */
export const useMessageCount = (record: InvestigationRecord): number => {
  const { count } = useConversationMessageCount(record);
  return record.conversation_id ? count ?? 0 : record.counters.comments;
};

export const AtAGlanceCard: React.FC<AtAGlanceCardProps> = ({ record, onNavigateTab }) => {
  const { counters } = record;
  const messageCount = useMessageCount(record);
  const openClaims = counters.claims_by_status.open ?? 0;
  const activeTasks = counters.tasks - counters.tasks_skipped;

  return (
    <SideCard title={i18n.AT_A_GLANCE} data-test-subj="investigationGlanceCard">
      <EuiDescriptionList
        type="column"
        compressed
        columnWidths={[1, 2]}
        listItems={[
          {
            title: i18n.GLANCE_EVIDENCE,
            description: i18n.EVIDENCE_ITEMS(counters.evidence),
          },
          {
            title: i18n.GLANCE_CLAIMS,
            description: i18n.CLAIMS_SUMMARY(counters.claims, openClaims),
          },
          {
            title: i18n.GLANCE_PROCEDURE,
            description: (
              <EuiButtonEmpty
                size="xs"
                flush="left"
                iconType={ICONS.chevronRight}
                iconSide="right"
                onClick={() => onNavigateTab('procedure')}
                data-test-subj="investigationGlanceProcedureLink"
              >
                {i18n.PROCEDURE_DONE(counters.tasks_done, activeTasks)}
              </EuiButtonEmpty>
            ),
          },
          {
            title: i18n.GLANCE_CONVERSATION,
            description: (
              <EuiButtonEmpty
                size="xs"
                flush="left"
                iconType={ICONS.chevronRight}
                iconSide="right"
                onClick={() => onNavigateTab('conversation')}
                data-test-subj="investigationGlanceConversationLink"
              >
                {i18n.CONVERSATION_MESSAGES(messageCount)}
              </EuiButtonEmpty>
            ),
          },
        ]}
      />
    </SideCard>
  );
};
AtAGlanceCard.displayName = 'AtAGlanceCard';
