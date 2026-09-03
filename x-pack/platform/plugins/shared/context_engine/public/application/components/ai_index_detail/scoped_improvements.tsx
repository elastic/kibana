/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHorizontalRule, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import type { GetAiIndexResponse } from '../../../../common/http_api/ai_indices';
import type { ImprovementAction } from '../../../../common/http_api/improvement_actions';
import type { Improvement } from '../../../../common/http_api/improvements';
import type { SignalGroup } from '../../../../common/http_api/signals';
import { useDecideImprovement } from '../../hooks/use_decide_improvement';
import { useKibana } from '../../hooks/use_kibana';
import { useScopedImprovements } from '../../hooks/use_scoped_improvements';
import { analyzeAndImprove } from '../../utils/analyze_and_improve';
import { ImprovementRow } from './improvement_row';
import { SignalGroupFlyout } from './signal_group_flyout';

interface ScopedImprovementsProps {
  aiIndex: GetAiIndexResponse | undefined;
  /** The actions this panel is responsible for; everything else stays in the Improvements panel. */
  actions: readonly ImprovementAction[];
  'data-test-subj': string;
}

/**
 * The open suggestions that would change this panel's part of the AI index.
 *
 * A suggestion to add a source is about the sources, and a reviewer weighing it wants to see what
 * is already configured. The combined Improvements panel keeps the full queue — this is the same
 * rows, filtered, shown where the change would land.
 *
 * Renders nothing when there is nothing to review, so a panel with no suggestions looks exactly as
 * it did before. It shares its query with the Improvements panel rather than fetching again: the
 * list is filtered here, in the client, off one cached response.
 */
export const ScopedImprovements = ({
  aiIndex,
  actions,
  'data-test-subj': dataTestSubj,
}: ScopedImprovementsProps) => {
  const {
    services: { getChatOpener },
  } = useKibana();
  const chatOpener = getChatOpener?.();

  const aiIndexId = aiIndex?.id;

  const scoped = useScopedImprovements({ aiIndexId, actions });
  const { approve, reject, approvingId, rejectingId } = useDecideImprovement(aiIndexId ?? '');
  const [provenanceGroup, setProvenanceGroup] = useState<SignalGroup | undefined>();

  const handleTalkWithAgent = (improvement: Improvement) => {
    if (aiIndex) {
      analyzeAndImprove(getChatOpener, { aiIndex, improvement });
    }
  };

  const handleViewProvenance = (improvement: Improvement) => {
    const [tag] = improvement.provenance.tags ?? [];
    if (tag) {
      setProvenanceGroup({ tag, count: improvement.provenance.signal_count ?? 0 });
    }
  };

  if (scoped.length === 0) {
    return null;
  }

  return (
    <div data-test-subj={dataTestSubj}>
      <EuiHorizontalRule margin="m" />

      <EuiText size="xs" color="subdued">
        <strong>
          {i18n.translate('xpack.contextEngine.aiIndexDetail.scopedImprovements.title', {
            defaultMessage:
              '{count, plural, one {# suggested change} other {# suggested changes}} — nothing is applied until you approve it',
            values: { count: scoped.length },
          })}
        </strong>
      </EuiText>

      <EuiSpacer size="s" />

      <div role="list">
        {scoped.map((improvement, index) => (
          <React.Fragment key={improvement.improvement_id}>
            <ImprovementRow
              improvement={improvement}
              onApprove={({ improvement_id: id }) => approve({ improvementId: id })}
              onReject={({ improvement_id: id }) => reject({ improvementId: id })}
              isApproving={approvingId === improvement.improvement_id}
              isRejecting={rejectingId === improvement.improvement_id}
              canDecide={aiIndex !== undefined}
              onTalkWithAgent={chatOpener ? handleTalkWithAgent : undefined}
              onViewProvenance={handleViewProvenance}
            />
            {index < scoped.length - 1 && <EuiSpacer size="s" />}
          </React.Fragment>
        ))}
      </div>

      {provenanceGroup && (
        <SignalGroupFlyout
          group={provenanceGroup}
          aiIndex={aiIndex}
          onClose={() => setProvenanceGroup(undefined)}
        />
      )}
    </div>
  );
};
