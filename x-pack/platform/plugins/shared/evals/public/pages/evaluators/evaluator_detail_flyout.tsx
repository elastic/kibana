/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCallOut,
  EuiCodeBlock,
  EuiComboBox,
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTimeline,
  EuiTitle,
  type EuiTimelineItemProps,
} from '@elastic/eui';
import { EvaluatorKindBadge } from '../../components/evaluator_kind_badge';
import {
  useEvaluatorDetail,
  useUpdateEvaluator,
  useDeleteEvaluator,
  type LlmJudgeConfig,
  type CodeConfig,
} from '../../hooks/use_evaluators_api';
import { EvaluatorPlayground } from './evaluator_playground';
import * as i18n from './translations';

interface EvaluatorDetailFlyoutProps {
  evaluatorId: string;
  onClose: () => void;
}

export const EvaluatorDetailFlyout: React.FC<EvaluatorDetailFlyoutProps> = ({
  evaluatorId,
  onClose,
}) => {
  const { data: evaluator, isLoading } = useEvaluatorDetail(evaluatorId);
  const updateEvaluator = useUpdateEvaluator();
  const deleteEvaluator = useDeleteEvaluator();
  const [showPlayground, setShowPlayground] = useState(false);
  const [tagInput, setTagInput] = useState<Array<{ label: string }>>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const onAddTag = () => {
    if (!evaluator || tagInput.length === 0) return;
    const newTags = [...evaluator.tags, ...tagInput.map((t) => t.label)];
    setMutationError(null);
    updateEvaluator.mutate(
      { evaluatorId, updates: { tags: newTags } },
      {
        onError: (err) => {
          setMutationError(err instanceof Error ? err.message : String(err));
        },
      }
    );
    setTagInput([]);
  };

  const onRemoveTag = (tag: string) => {
    if (!evaluator) return;
    const newTags = evaluator.tags.filter((t) => t !== tag);
    setMutationError(null);
    updateEvaluator.mutate(
      { evaluatorId, updates: { tags: newTags } },
      {
        onError: (err) => {
          setMutationError(err instanceof Error ? err.message : String(err));
        },
      }
    );
  };

  const onDelete = async () => {
    setMutationError(null);
    try {
      await deleteEvaluator.mutateAsync({ evaluatorId });
      onClose();
    } catch (err) {
      setMutationError(err instanceof Error ? err.message : String(err));
      setShowDeleteConfirm(false);
    }
  };

  if (isLoading) {
    return (
      <EuiFlyout onClose={onClose} size="m">
        <EuiFlyoutBody>
          <EuiFlexGroup justifyContent="center" alignItems="center" css={{ minHeight: 200 }}>
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="xl" />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutBody>
      </EuiFlyout>
    );
  }

  if (!evaluator) {
    return null;
  }

  const config = evaluator.config ?? { type: 'prebuilt' as const };
  const isLlmJudge = config.type === 'llm-judge';
  const isCode = config.type === 'code';

  const versionItems: EuiTimelineItemProps[] = evaluator.versions.map((version) => ({
    icon: 'dot',
    children: (
      <EuiText size="xs">
        {i18n.getVersionLabel(version.version, new Date(version.created_at).toLocaleString())}
        {version.changelog && (
          <>
            <br />
            <EuiText size="xs" color="subdued">
              {version.changelog}
            </EuiText>
          </>
        )}
      </EuiText>
    ),
  }));

  return (
    <EuiFlyout onClose={onClose} size="m">
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center" gutterSize="m">
          <EuiFlexItem>
            <EuiTitle size="m">
              <h2>{evaluator.name}</h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EvaluatorKindBadge kind={evaluator.kind} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">{evaluator.type}</EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
        {evaluator.description && (
          <>
            <EuiSpacer size="s" />
            <EuiText size="s" color="subdued">
              {evaluator.description}
            </EuiText>
          </>
        )}
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {mutationError && (
          <>
            <EuiCallOut title={i18n.UPDATE_ERROR_TITLE} color="danger" iconType="alert" size="s">
              <p>{mutationError}</p>
            </EuiCallOut>
            <EuiSpacer size="m" />
          </>
        )}
        {/* Sharing toggle — only for custom evaluators */}
        {evaluator.source === 'custom' && (
          <>
            <EuiSwitch
              label={i18n.SHARE_ACROSS_SPACES}
              checked={evaluator.shared ?? false}
              onChange={(e) => {
                setMutationError(null);
                updateEvaluator.mutate(
                  { evaluatorId, updates: { shared: e.target.checked } },
                  {
                    onError: (err) => {
                      setMutationError(err instanceof Error ? err.message : String(err));
                    },
                  }
                );
              }}
              disabled={updateEvaluator.isLoading}
            />
            <EuiSpacer size="m" />
          </>
        )}

        {/* Configuration */}
        <EuiTitle size="xs">
          <h3>{i18n.DETAIL_CONFIG_SECTION}</h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiPanel hasShadow={false} color="subdued">
          {isLlmJudge && (
            <>
              <EuiText size="xs">
                <strong>{i18n.PROMPT_TEMPLATE_LABEL}</strong>
              </EuiText>
              <EuiSpacer size="xs" />
              <EuiCodeBlock language="text" overflowHeight={200} fontSize="s" paddingSize="s">
                {(config as LlmJudgeConfig).prompt_template}
              </EuiCodeBlock>
              <EuiSpacer size="s" />
              <EuiText size="xs">
                <strong>{i18n.SCORING_MODE_LABEL}:</strong>{' '}
                {(config as LlmJudgeConfig).scoring_mode}
              </EuiText>
              <EuiText size="xs">
                <strong>{i18n.FEEDBACK_KEY_LABEL}:</strong>{' '}
                {(config as LlmJudgeConfig).feedback_key}
              </EuiText>
            </>
          )}
          {isCode && (
            <>
              <EuiText size="xs">
                <strong>{i18n.CODE_BODY_LABEL}</strong>
              </EuiText>
              <EuiSpacer size="xs" />
              <EuiCodeBlock language="javascript" overflowHeight={200} fontSize="s" paddingSize="s">
                {(config as CodeConfig).function_body}
              </EuiCodeBlock>
            </>
          )}
        </EuiPanel>

        <EuiSpacer size="l" />

        {/* Tags */}
        <EuiTitle size="xs">
          <h3>{i18n.DETAIL_TAGS_SECTION}</h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
          {evaluator.tags.map((tag) => (
            <EuiFlexItem key={tag} grow={false}>
              <EuiBadge
                color="hollow"
                iconType="cross"
                iconSide="right"
                iconOnClick={() => onRemoveTag(tag)}
                iconOnClickAriaLabel={`Remove tag ${tag}`}
              >
                {tag}
              </EuiBadge>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="s" responsive={false}>
          <EuiFlexItem>
            <EuiComboBox
              placeholder={i18n.ADD_TAG_PLACEHOLDER}
              selectedOptions={tagInput}
              onCreateOption={(value) => setTagInput([...tagInput, { label: value }])}
              onChange={setTagInput}
              isClearable
              compressed
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType="plusInCircle"
              onClick={onAddTag}
              aria-label="Add tag"
              disabled={tagInput.length === 0}
            />
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="l" />

        {/* Version History */}
        <EuiTitle size="xs">
          <h3>{i18n.DETAIL_VERSIONS_SECTION}</h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        {versionItems.length > 0 ? (
          <EuiTimeline items={versionItems} />
        ) : (
          <EuiText size="s" color="subdued">
            No version history available.
          </EuiText>
        )}

        <EuiSpacer size="l" />

        {/* Playground */}
        {showPlayground && (
          <EvaluatorPlayground
            evaluatorId={evaluatorId}
            config={config.type !== 'esql' ? (config as LlmJudgeConfig | CodeConfig) : undefined}
          />
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  color="danger"
                  onClick={() => setShowDeleteConfirm(true)}
                  isLoading={deleteEvaluator.isLoading}
                >
                  {i18n.DELETE_BUTTON}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiButton onClick={() => setShowPlayground(!showPlayground)} iconType="play">
                  {i18n.TEST_BUTTON}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
      {showDeleteConfirm && (
        <EuiConfirmModal
          title={i18n.DELETE_CONFIRM_TITLE}
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={onDelete}
          cancelButtonText={i18n.CANCEL_BUTTON}
          confirmButtonText={i18n.DELETE_CONFIRM_BUTTON}
          buttonColor="danger"
          isLoading={deleteEvaluator.isLoading}
        >
          <p>{i18n.DELETE_CONFIRM_BODY}</p>
        </EuiConfirmModal>
      )}
    </EuiFlyout>
  );
};
