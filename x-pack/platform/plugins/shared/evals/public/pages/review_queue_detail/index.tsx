/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCodeBlock,
  EuiDescriptionList,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPageSection,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { isHttpFetchError } from '@kbn/core-http-browser';
import { TraceWaterfall, useTraceSpans } from '@kbn/llm-trace-waterfall';
import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import type { BlindReviewItem, RevealedReviewItem } from '@kbn/evals-common';
import { useHistory, useParams } from 'react-router-dom';
import { useEvalsTraceFetcher } from '../../hooks/use_evals_api';
import { useEvalsPermissions } from '../../hooks/use_evals_permissions';
import {
  useNextReviewItem,
  useReviewQueue,
  useReviewQueueAgreement,
  useSubmitReviewVerdict,
  useTraceEvidence,
  type SubmitReviewVerdictVariables,
} from '../../hooks/use_review_queues_api';
import { JudgeAgreementPanel } from '../../components/judge_agreement';
import { REVIEW_QUEUES_PATH } from '../review_queues_list';
import { VerdictForm } from './verdict_form';
import * as i18n from './translations';

const TRACE_HEIGHT = 420;

const TraceEvidence: React.FC<{ traceId: string }> = ({ traceId }) => {
  const { data, isLoading } = useTraceEvidence(traceId);
  const fetchTrace = useEvalsTraceFetcher();
  const {
    spans,
    durationMs,
    isLoading: traceLoading,
    error: traceError,
  } = useTraceSpans(traceId, { fetchTrace });

  return (
    <>
      {isLoading ? (
        <EuiLoadingSpinner size="l" />
      ) : data?.status === 'resolved' ? (
        <EuiFlexGroup gutterSize="m" responsive={false} wrap>
          <EuiFlexItem css={{ minWidth: 320 }}>
            <EuiTitle size="xxs">
              <h3>{i18n.INPUT_TITLE}</h3>
            </EuiTitle>
            <EuiSpacer size="xs" />
            <EuiCodeBlock
              paddingSize="m"
              fontSize="s"
              overflowHeight={240}
              isCopyable
              whiteSpace="pre-wrap"
              data-test-subj="evalsReviewInput"
            >
              {data.evidence.input.message}
            </EuiCodeBlock>
          </EuiFlexItem>
          <EuiFlexItem css={{ minWidth: 320 }}>
            <EuiTitle size="xxs">
              <h3>{i18n.OUTPUT_TITLE}</h3>
            </EuiTitle>
            <EuiSpacer size="xs" />
            <EuiCodeBlock
              paddingSize="m"
              fontSize="s"
              overflowHeight={240}
              isCopyable
              whiteSpace="pre-wrap"
              data-test-subj="evalsReviewOutput"
            >
              {data.evidence.response.message}
            </EuiCodeBlock>
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <EuiCallOut announceOnMount size="s" color="warning" title={i18n.EVIDENCE_UNAVAILABLE} />
      )}
      <EuiSpacer size="m" />
      <EuiTitle size="xxs">
        <h3>{i18n.TRACE_TITLE}</h3>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <div style={{ height: TRACE_HEIGHT }}>
        <TraceWaterfall
          spans={spans}
          traceId={traceId}
          durationMs={durationMs}
          isLoading={traceLoading}
          error={traceError}
        />
      </div>
    </>
  );
};

/** Judge and human verdicts side by side. Only ever rendered from a submit response. */
const RevealedVerdict: React.FC<{ item: RevealedReviewItem; onNext: () => void }> = ({
  item,
  onNext,
}) => {
  const judgeLabel = item.score.label?.trim().toLowerCase();
  const humanLabel = item.human?.label;
  const comparable = judgeLabel !== undefined && humanLabel !== undefined;

  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="m" data-test-subj="evalsReviewRevealed">
      <EuiTitle size="xs">
        <h3>{i18n.REVEAL_TITLE}</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiDescriptionList
        compressed
        type="column"
        listItems={[
          { title: i18n.JUDGE_LABEL, description: item.score.label ?? i18n.NOT_AVAILABLE },
          { title: i18n.JUDGE_SCORE, description: item.score.value ?? i18n.NOT_AVAILABLE },
          { title: i18n.YOUR_VERDICT, description: humanLabel ?? i18n.NOT_AVAILABLE },
        ]}
      />
      {comparable ? (
        <>
          <EuiSpacer size="s" />
          <EuiCallOut
            announceOnMount
            size="s"
            color={judgeLabel === humanLabel ? 'success' : 'warning'}
            title={judgeLabel === humanLabel ? i18n.AGREES : i18n.DISAGREES}
          />
        </>
      ) : null}
      <EuiSpacer size="m" />
      <EuiButton fill onClick={onNext} data-test-subj="evalsReviewNext">
        {i18n.NEXT_ITEM}
      </EuiButton>
    </EuiPanel>
  );
};

export const ReviewQueueDetailPage: React.FC = () => {
  const history = useHistory();
  const { queueId } = useParams<{ queueId: string }>();
  const { canReview } = useEvalsPermissions();
  const queue = useReviewQueue(queueId);
  // Both routes need the review privilege, so a read-only user must not fire them and get 403s.
  const next = useNextReviewItem(queueId, { enabled: canReview });
  const submit = useSubmitReviewVerdict(queueId);
  const agreement = useReviewQueueAgreement(queueId, { enabled: canReview });
  const [revealed, setRevealed] = useState<RevealedReviewItem | null>(null);

  const item: BlindReviewItem | null = revealed ?? next.data?.item ?? null;

  const goToNext = async () => {
    setRevealed(null);
    submit.reset();
    await next.refetch();
  };

  const onSubmit = (verdict: SubmitReviewVerdictVariables['verdict']) => {
    if (!item) {
      return;
    }
    submit.mutate(
      { itemId: item.id, verdict },
      {
        onSuccess: async (response) => {
          if (verdict.skip) {
            await goToNext();
          } else {
            setRevealed(response.item);
          }
        },
      }
    );
  };

  if (queue.isLoading || (canReview && next.isLoading && !revealed)) {
    return <EuiLoadingSpinner size="xl" />;
  }

  if (queue.error || !queue.data) {
    return (
      <EuiEmptyPrompt
        color="danger"
        iconType="warning"
        title={<h2>{i18n.LOAD_ERROR_TITLE}</h2>}
        actions={
          <EuiButton onClick={() => queue.refetch()} data-test-subj="evalsReviewQueueRetry">
            {i18n.RETRY}
          </EuiButton>
        }
      />
    );
  }

  const { counts } = queue.data;
  const total = counts.pending + counts.reviewed + counts.skipped;

  return (
    <EuiPageSection>
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
        <EuiFlexItem>
          <EuiTitle size="m">
            <h2>{queue.data.name}</h2>
          </EuiTitle>
          <EuiText size="s" color="subdued">
            {i18n.getEvaluatorLabel(queue.data.evaluator_name, queue.data.evaluator_version)}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            iconType="chevronSingleLeft"
            {...reactRouterNavigate(history, REVIEW_QUEUES_PATH)}
          >
            {i18n.BACK_TO_QUEUES}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {agreement.data ? (
        <>
          <JudgeAgreementPanel binary={agreement.data.binary} ordinal={agreement.data.ordinal} />
          <EuiSpacer size="m" />
        </>
      ) : null}
      <EuiPanel hasBorder hasShadow={false} paddingSize="m">
        <EuiTitle size="xxs">
          <h3>{i18n.RUBRIC_TITLE}</h3>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText size="s" data-test-subj="evalsReviewRubric">
          {queue.data.rubric.trim() ? queue.data.rubric : i18n.NO_RUBRIC}
        </EuiText>
      </EuiPanel>
      <EuiSpacer size="m" />
      {item ? (
        <>
          <EuiText size="s" color="subdued">
            {i18n.getItemPosition(item.position + 1, total)}
          </EuiText>
          <EuiSpacer size="s" />
          <TraceEvidence key={item.id} traceId={item.source.trace_id} />
          <EuiSpacer size="m" />
          {revealed ? (
            <RevealedVerdict item={revealed} onNext={goToNext} />
          ) : canReview ? (
            <>
              <VerdictForm key={item.id} isSubmitting={submit.isLoading} onSubmit={onSubmit} />
              {submit.error ? (
                <>
                  <EuiSpacer size="s" />
                  <EuiCallOut
                    announceOnMount
                    color="danger"
                    size="s"
                    title={i18n.SUBMIT_ERROR_TITLE}
                  >
                    {isHttpFetchError(submit.error)
                      ? (submit.error.body as { message?: string } | undefined)?.message
                      : null}
                  </EuiCallOut>
                </>
              ) : null}
            </>
          ) : (
            <EuiCallOut announceOnMount size="s" title={i18n.NO_REVIEW_PRIVILEGE} />
          )}
        </>
      ) : !canReview ? (
        <EuiCallOut announceOnMount size="s" title={i18n.NO_REVIEW_PRIVILEGE} />
      ) : next.error ? (
        <EuiEmptyPrompt
          color="danger"
          iconType="warning"
          title={<h3>{i18n.LOAD_ERROR_TITLE}</h3>}
          actions={
            <EuiButton onClick={() => next.refetch()} data-test-subj="evalsReviewNextRetry">
              {i18n.RETRY}
            </EuiButton>
          }
        />
      ) : (
        <EuiEmptyPrompt
          iconType="checkCircleFill"
          title={<h3>{i18n.QUEUE_COMPLETE_TITLE}</h3>}
          body={<p>{i18n.QUEUE_COMPLETE_BODY}</p>}
        />
      )}
    </EuiPageSection>
  );
};
