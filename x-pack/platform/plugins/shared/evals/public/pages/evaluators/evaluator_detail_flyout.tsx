/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiIconTip,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FormattedMessage, FormattedRelative } from '@kbn/i18n-react';
import { KbnDangerCallout } from '@kbn/ui-callout';
import type { JudgeEvidence, LlmJudgeConfig } from '@kbn/evals-common';
import { useEvaluator } from '../../hooks/use_evaluators_api';
import { getErrorMessage } from '../../utils/get_error_message';
import * as i18n from './translations';

interface EvaluatorDetailFlyoutProps {
  evaluatorName: string;
  canEdit: boolean;
  onEdit: () => void;
  onClose: () => void;
}

const EVIDENCE_LABELS: Record<JudgeEvidence[number], string> = {
  input: i18n.INPUT_EVIDENCE,
  response: i18n.RESPONSE_EVIDENCE,
  steps: i18n.STEPS_EVIDENCE,
};

const describeScore = (score: LlmJudgeConfig['output']['scores'][number]): string => {
  if (score.type === 'number') {
    return i18n.NUMERIC_SCORE_SUMMARY;
  }
  const labels = (score.labels ?? []).map(({ value, score: worth }) => `${value}=${worth}`);
  return i18n.CATEGORICAL_SCORE_SUMMARY(labels.join(', '));
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <>
    <EuiTitle size="xxs">
      <h3>{title}</h3>
    </EuiTitle>
    <EuiSpacer size="s" />
    {children}
    <EuiSpacer size="l" />
  </>
);

const JudgeDetails: React.FC<{ judge: LlmJudgeConfig }> = ({ judge }) => (
  <>
    <EuiFlexGroup gutterSize="xl" responsive={false} wrap>
      <EuiFlexItem grow={false}>
        <EuiTitle size="xxs">
          <h3>{i18n.EVIDENCE_LABEL}</h3>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiFlexGroup gutterSize="xs" responsive={false} wrap>
          {judge.evidence.map((key) => (
            <EuiFlexItem key={key} grow={false}>
              <EuiBadge color="hollow">{EVIDENCE_LABELS[key]}</EuiBadge>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiTitle size="xxs">
          <h3>{i18n.REFERENCE_DATA_LABEL}</h3>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText size="s" color={judge.reference_data_keys?.length ? 'default' : 'subdued'}>
          {judge.reference_data_keys?.length
            ? judge.reference_data_keys.join(', ')
            : i18n.NO_REFERENCE_DATA_KEYS}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
    <EuiSpacer size="l" />

    <Section title={i18n.SYSTEM_PROMPT_LABEL}>
      <EuiCodeBlock paddingSize="m" fontSize="s" isCopyable overflowHeight={160}>
        {judge.system_prompt}
      </EuiCodeBlock>
    </Section>

    <Section title={i18n.PROMPT_LABEL}>
      <EuiCodeBlock paddingSize="m" fontSize="s" isCopyable overflowHeight={240}>
        {judge.prompt}
      </EuiCodeBlock>
    </Section>

    <EuiTitle size="xxs">
      <h3>{i18n.SCORES_TITLE}</h3>
    </EuiTitle>
    <EuiSpacer size="s" />
    {judge.output.scores.map((score) => (
      <React.Fragment key={score.name}>
        <EuiPanel hasBorder hasShadow={false} paddingSize="m">
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <strong>{score.name}</strong>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">{describeScore(score)}</EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
          {score.description ? (
            <>
              <EuiSpacer size="s" />
              <EuiText size="s" color="subdued">
                {score.description}
              </EuiText>
            </>
          ) : null}
        </EuiPanel>
        <EuiSpacer size="s" />
      </React.Fragment>
    ))}
  </>
);

/** Read-only view of a stored evaluator, including the versions saved before this one. */
export const EvaluatorDetailFlyout: React.FC<EvaluatorDetailFlyoutProps> = ({
  evaluatorName,
  canEdit,
  onEdit,
  onClose,
}) => {
  const titleId = useGeneratedHtmlId();
  // Undefined means the current version, which is also what the catalog row links to.
  const [selectedVersion, setSelectedVersion] = useState<string | undefined>();
  const { data, isLoading, error } = useEvaluator(evaluatorName, selectedVersion);
  const evaluator = data?.evaluator;

  // The previous definition stays on screen while the chosen one loads, so the two can
  // disagree for a moment. While they do, the body is not the selected version and must
  // not be read as it. No selection means the current version, which is what loads first.
  const isShowingOtherVersion =
    Boolean(evaluator) && Boolean(selectedVersion) && selectedVersion !== evaluator?.version;

  useEffect(() => {
    // A failed fetch would otherwise leave the selector naming a version that never
    // loaded, beside a body from a different one. Falling back to what is rendered keeps
    // the label honest; that version is already cached, so nothing flickers.
    if (error && evaluator && selectedVersion && selectedVersion !== evaluator.version) {
      setSelectedVersion(evaluator.version);
    }
  }, [error, evaluator, selectedVersion]);

  // `versions` is newest-first, so the head is the one an experiment would pick up.
  const [currentVersion] = evaluator?.versions ?? [];
  const versionOptions = (evaluator?.versions ?? []).map((version) => ({
    value: version,
    text: version === currentVersion ? i18n.CURRENT_VERSION_OPTION(version) : version,
  }));

  return (
    <EuiFlyout
      onClose={onClose}
      size="m"
      aria-labelledby={titleId}
      data-test-subj="evalsEvaluatorDetailFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={titleId}>{evaluatorName}</h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
          {evaluator ? (
            <>
              <EuiFlexItem grow={false}>
                <EuiBadge>{evaluator.kind === 'llm' ? i18n.LLM_KIND : i18n.CODE_KIND}</EuiBadge>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge>
                  {evaluator.origin === 'built_in'
                    ? i18n.BUILT_IN_ORIGIN
                    : i18n.USER_DEFINED_ORIGIN}
                </EuiBadge>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                {versionOptions.length > 1 ? (
                  <EuiSelect
                    compressed
                    prepend={i18n.VERSION_LABEL}
                    append={<EuiIconTip content={i18n.VERSION_HISTORY_HELP} position="right" />}
                    // The choice, not what is rendered: the previous version stays on screen
                    // while the chosen one loads, and the control has to follow the click.
                    value={selectedVersion ?? evaluator.version}
                    options={versionOptions}
                    onChange={(event) => setSelectedVersion(event.target.value)}
                    aria-label={i18n.VERSION_LABEL}
                    data-test-subj="evalsEvaluatorDetailVersion"
                  />
                ) : (
                  <EuiBadge color="hollow">{`${i18n.VERSION_LABEL} ${evaluator.version}`}</EuiBadge>
                )}
              </EuiFlexItem>
              {isShowingOtherVersion ? (
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued" data-test-subj="evalsEvaluatorDetailPending">
                    <EuiLoadingSpinner size="s" /> {i18n.LOADING_VERSION(selectedVersion ?? '')}
                  </EuiText>
                </EuiFlexItem>
              ) : null}
            </>
          ) : null}
        </EuiFlexGroup>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {error ? (
          <>
            <KbnDangerCallout
              title={i18n.DETAILS_LOAD_ERROR_TITLE}
              text={getErrorMessage(error)}
              data-test-subj="evalsEvaluatorDetailError"
            />
            <EuiSpacer size="m" />
          </>
        ) : null}

        {isLoading && !evaluator ? <EuiLoadingSpinner size="l" /> : null}

        {evaluator ? (
          // Dimmed while it belongs to a version other than the selected one, so nothing
          // here reads as the definition the header names.
          <div css={{ opacity: isShowingOtherVersion ? 0.5 : 1 }} aria-busy={isShowingOtherVersion}>
            <EuiText size="s">
              <p>{evaluator.description}</p>
            </EuiText>
            {evaluator.updated_at ? (
              <>
                <EuiSpacer size="s" />
                <EuiText size="xs" color="subdued" data-test-subj="evalsEvaluatorDetailUpdated">
                  <EuiToolTip content={evaluator.updated_at}>
                    {/* Focusable so the exact timestamp behind the relative one is reachable
                        without a pointer, matching the catalog's `LastUpdatedAt`. */}
                    <span tabIndex={0}>
                      {evaluator.created_by ? (
                        <FormattedMessage
                          id="xpack.evals.evaluators.updatedByDescription"
                          defaultMessage="Updated {when} by {user}"
                          values={{
                            when: <FormattedRelative value={new Date(evaluator.updated_at)} />,
                            user: evaluator.created_by,
                          }}
                        />
                      ) : (
                        <FormattedMessage
                          id="xpack.evals.evaluators.updatedAtDescription"
                          defaultMessage="Updated {when}"
                          values={{
                            when: <FormattedRelative value={new Date(evaluator.updated_at)} />,
                          }}
                        />
                      )}
                    </span>
                  </EuiToolTip>
                </EuiText>
              </>
            ) : null}

            <EuiSpacer size="l" />

            {evaluator.judge ? (
              <JudgeDetails judge={evaluator.judge} />
            ) : (
              <EuiText size="s" color="subdued">
                {i18n.BUILT_IN_DETAILS_NOTE}
              </EuiText>
            )}
          </div>
        ) : null}
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} data-test-subj="evalsEvaluatorDetailClose">
              {i18n.CLOSE_BUTTON}
            </EuiButtonEmpty>
          </EuiFlexItem>
          {canEdit && evaluator?.origin === 'user_defined' ? (
            <EuiFlexItem grow={false}>
              <EuiButton fill onClick={onEdit} data-test-subj="evalsEvaluatorDetailEdit">
                {i18n.EDIT_BUTTON}
              </EuiButton>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
