/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSkeletonText,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTextArea,
  useEuiTheme,
  useGeneratedHtmlId,
  useIsWithinMaxBreakpoint,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnInfoCallout } from '@kbn/ui-callout';
import React, { useCallback, useMemo, useState } from 'react';
import {
  DEFAULT_DREAMING_INTERVAL,
  DREAMING_DISABLED,
  type AiIndexDreamingConfig,
} from '../../../../../common/dreaming';
import { matchingTemplateId } from '../../../../../common/dreaming_templates';
import type { AiIndexHttpItem } from '../../../../../common/http_api/ai_indices';
import { validateDreamingInterval } from '../../../../../common/validation';
import { useAiIndexDreaming } from '../../../hooks/use_ai_index_dreaming';
import {
  useLatestWorkflowExecution,
  type LatestWorkflowExecution,
} from '../../../hooks/use_latest_workflow_execution';
import { useDreamingTemplates } from '../../../hooks/use_dreaming_templates';
import { useNavigation } from '../../../hooks/use_navigation';
import { useSaveDreamingConfig } from '../../../hooks/use_save_dreaming_config';
import { getAiIndexDreamingTemplatePath } from '../../../paths';
import {
  DreamingConfigEditor,
  draftBuildsAnything,
  draftOf,
  typesOfDraft,
  type DreamingConfigDraft,
} from '../../dreaming_config/dreaming_config_editor';
import { DreamingLastRunStatus } from './dreaming_last_run_status';
import { DreamingRunsSection } from './dreaming_runs_section';
import { SettingsPanel } from './settings_panel';
import { SettingsRow } from './settings_row';

/** Maximum height of the dreaming config JSON, in pixels, before it scrolls. */
export const DREAMING_JSON_MAX_HEIGHT = 480;

const enabledLabel = i18n.translate('xpack.contextEngine.aiIndexDetail.dreaming.enabledLabel', {
  defaultMessage: 'Dream on a schedule',
});
const scheduleDescription = i18n.translate(
  'xpack.contextEngine.aiIndexDetail.dreaming.scheduleDescription',
  { defaultMessage: 'How often dreaming runs.' }
);
const intervalPrependLabel = i18n.translate(
  'xpack.contextEngine.aiIndexDetail.dreaming.intervalLabel',
  {
    defaultMessage: 'Every',
  }
);

const sameTypes = (a: DreamingConfigDraft, b: DreamingConfigDraft): boolean =>
  JSON.stringify(typesOfDraft(a)) === JSON.stringify(typesOfDraft(b));

const DreamingJsonModal = ({
  dreaming,
  onClose,
}: {
  dreaming: AiIndexDreamingConfig;
  onClose: () => void;
}) => {
  const titleId = useGeneratedHtmlId();
  return (
    <EuiModal
      aria-labelledby={titleId}
      onClose={onClose}
      style={{ width: 800 }}
      data-test-subj="contextAiIndexDreamingJsonModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>
          {i18n.translate('xpack.contextEngine.aiIndexDetail.dreaming.jsonTitle', {
            defaultMessage: 'Dreaming config',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiCodeBlock
          language="json"
          fontSize="s"
          paddingSize="m"
          overflowHeight={DREAMING_JSON_MAX_HEIGHT}
          isCopyable
          data-test-subj="contextAiIndexDreamingJson"
        >
          {JSON.stringify(dreaming, null, 2)}
        </EuiCodeBlock>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButton onClick={onClose} data-test-subj="contextAiIndexDreamingJsonClose">
          {i18n.translate('xpack.contextEngine.aiIndexDetail.dreaming.jsonClose', {
            defaultMessage: 'Close',
          })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};

interface DreamingEditorProps {
  aiIndexId: string;
  dreaming: AiIndexDreamingConfig;
  workflowIds: readonly string[];
  latestExecution: LatestWorkflowExecution;
  onStarted: (executionIds: string[]) => void;
}

const DreamingEditor = ({
  aiIndexId,
  dreaming,
  workflowIds,
  latestExecution,
  onStarted,
}: DreamingEditorProps) => {
  const saved = useMemo(() => draftOf(dreaming), [dreaming]);
  const [edited, setEdited] = useState<DreamingConfigDraft>();
  const [editedInstructions, setEditedInstructions] = useState<string>();
  const [editedEnabled, setEditedEnabled] = useState<boolean>();
  const [editedInterval, setEditedInterval] = useState<string>();
  const { saveConfig, isSaving } = useSaveDreamingConfig();
  const { templates } = useDreamingTemplates();
  const { euiTheme } = useEuiTheme();
  const isCompact = useIsWithinMaxBreakpoint('s');
  const enabledSwitchId = useGeneratedHtmlId({ prefix: 'contextAiIndexDreamingEnabled' });

  const draft = edited ?? saved;
  const savedInstructions = dreaming.instructions ?? '';
  const instructions = editedInstructions ?? savedInstructions;
  const enabled = editedEnabled ?? dreaming.enabled;
  const savedInterval = dreaming.schedule?.interval ?? DEFAULT_DREAMING_INTERVAL;
  const interval = editedInterval ?? savedInterval;
  const intervalError = enabled ? validateDreamingInterval(interval.trim()) : undefined;
  const isDirty =
    (edited !== undefined && !sameTypes(edited, saved)) ||
    instructions !== savedInstructions ||
    enabled !== dreaming.enabled ||
    interval.trim() !== savedInterval;
  const suggestedId = matchingTemplateId(dreaming, templates);
  const suggestedEntities = templates.find(({ id }) => id === suggestedId)?.dreaming.entities;

  const discard = () => {
    setEdited(undefined);
    setEditedInstructions(undefined);
    setEditedEnabled(undefined);
    setEditedInterval(undefined);
  };

  const save = async () => {
    const { instructions: _, schedule: __, ...rest } = dreaming;
    const trimmed = instructions.trim();
    const trimmedInterval = interval.trim();
    const isIntervalValid = validateDreamingInterval(trimmedInterval) === undefined;
    // Invalid interval while schedule is off: intervalError is undefined, so keep the saved value.
    const config: AiIndexDreamingConfig = {
      ...rest,
      enabled,
      schedule: { interval: isIntervalValid ? trimmedInterval : savedInterval },
      ...(trimmed && { instructions: trimmed }),
      ...typesOfDraft(draft),
    };
    if (await saveConfig({ aiIndexId, config })) {
      discard();
    }
  };

  return (
    <>
      <SettingsRow
        title={i18n.translate('xpack.contextEngine.aiIndexDetail.dreaming.scheduleTitle', {
          defaultMessage: 'Schedule',
        })}
        description={scheduleDescription}
      >
        <div
          css={{
            display: 'grid',
            gridTemplateColumns: isCompact ? '1fr' : 'auto 1fr',
            alignItems: 'start',
            rowGap: euiTheme.size.s,
            columnGap: euiTheme.size.l,
          }}
        >
          <div css={{ display: 'flex', alignItems: 'center', minHeight: euiTheme.size.xl }}>
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  <label htmlFor={enabledSwitchId}>{enabledLabel}</label>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiSwitch
                  id={enabledSwitchId}
                  showLabel={false}
                  label={enabledLabel}
                  checked={enabled}
                  onChange={(event) => setEditedEnabled(event.target.checked)}
                  data-test-subj="contextAiIndexDreamingEnabled"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </div>
          {/* Spans the "Last run" row so help text and errors do not push it away from the toggle. */}
          <div css={isCompact ? undefined : { gridRow: 'span 2' }}>
            <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
              {enabled ? (
                <EuiFlexItem grow={isCompact ? true : 4}>
                  <EuiFormRow
                    display="rowCompressed"
                    fullWidth
                    isInvalid={intervalError !== undefined}
                    error={intervalError}
                  >
                    <EuiFieldText
                      compressed
                      fullWidth
                      prepend={intervalPrependLabel}
                      value={interval}
                      isInvalid={intervalError !== undefined}
                      onChange={(event) => setEditedInterval(event.target.value)}
                      data-test-subj="contextAiIndexDreamingInterval"
                    />
                  </EuiFormRow>
                </EuiFlexItem>
              ) : null}
              {isCompact ? null : <EuiFlexItem grow={6} />}
              <EuiFlexItem grow={false}>
                <DreamingRunsSection
                  aiIndexId={aiIndexId}
                  savedDreaming={dreaming}
                  latestIsRunning={latestExecution.isRunning}
                  isDirty={isDirty}
                  onStarted={onStarted}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </div>
          <EuiText size="xs" color="subdued">
            <DreamingLastRunStatus
              workflowIds={workflowIds}
              executions={latestExecution.executions}
              execution={latestExecution.execution}
            />
          </EuiText>
        </div>
      </SettingsRow>
      <EuiHorizontalRule margin="m" />
      <SettingsRow
        title={i18n.translate('xpack.contextEngine.aiIndexDetail.dreaming.instructionsLabel', {
          defaultMessage: 'Instructions',
        })}
        description={i18n.translate('xpack.contextEngine.aiIndexDetail.dreaming.instructionsHelp', {
          defaultMessage:
            'What dreaming is told about this AI index: what it holds, who uses it, and what to record or skip.',
        })}
      >
        <EuiTextArea
          fullWidth
          rows={6}
          value={instructions}
          onChange={(event) => setEditedInstructions(event.target.value)}
          aria-label={i18n.translate(
            'xpack.contextEngine.aiIndexDetail.dreaming.instructionsAriaLabel',
            { defaultMessage: 'Dreaming instructions' }
          )}
          data-test-subj="contextAiIndexDreamingInstructions"
        />
      </SettingsRow>
      <EuiHorizontalRule margin="m" />
      <SettingsRow
        title={i18n.translate('xpack.contextEngine.aiIndexDetail.dreaming.learnsTitle', {
          defaultMessage: 'What dreaming learns',
        })}
        description={i18n.translate(
          'xpack.contextEngine.aiIndexDetail.dreaming.learnsDescription',
          {
            defaultMessage:
              'Fact types always. Entity and relationship types when entities are on.',
          }
        )}
      >
        <DreamingConfigEditor
          draft={draft}
          onChange={setEdited}
          {...(suggestedEntities && { suggestedEntities })}
        />
      </SettingsRow>
      {isDirty && (
        <>
          <EuiSpacer size="l" />
          <EuiFlexGroup justifyContent="flexEnd" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={discard} data-test-subj="contextAiIndexDreamingDiscard">
                {i18n.translate('xpack.contextEngine.aiIndexDetail.dreaming.discard', {
                  defaultMessage: 'Discard changes',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                onClick={save}
                isLoading={isSaving}
                isDisabled={!draftBuildsAnything(draft) || intervalError !== undefined}
                data-test-subj="contextAiIndexDreamingSave"
              >
                {i18n.translate('xpack.contextEngine.aiIndexDetail.dreaming.save', {
                  defaultMessage: 'Save changes',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
    </>
  );
};

interface DreamingPanelProps {
  aiIndex: AiIndexHttpItem;
}

/**
 * Shows and edits what an AI index's dreaming learns and how often it runs.
 * An AI index without dreaming set up links to the setup instead.
 */
export const DreamingPanel = ({ aiIndex }: DreamingPanelProps) => {
  const { navigateToContextEngine } = useNavigation();
  const [isJsonOpen, setIsJsonOpen] = useState(false);
  const {
    dreaming: savedDreaming,
    workflowIds,
    isLoading,
  } = useAiIndexDreaming(aiIndex.id, { enabled: true });
  const [startedExecutionIds, setStartedExecutionIds] = useState<string[]>();
  const clearStartedExecutionIds = useCallback(() => setStartedExecutionIds(undefined), []);
  const latestExecution = useLatestWorkflowExecution(workflowIds, {
    enabled: workflowIds.length > 0,
    awaitedExecutionIds: startedExecutionIds,
    onAwaitedObserved: clearStartedExecutionIds,
  });
  const dreaming = savedDreaming ?? DREAMING_DISABLED;
  const isSetUp = dreaming.enabled || draftBuildsAnything(draftOf(dreaming));

  const renderContent = () => {
    if (isLoading) {
      return <EuiSkeletonText lines={3} data-test-subj="contextAiIndexDreamingLoading" />;
    }
    if (isSetUp) {
      return (
        <DreamingEditor
          key={JSON.stringify(dreaming)}
          aiIndexId={aiIndex.id}
          dreaming={dreaming}
          workflowIds={workflowIds}
          latestExecution={latestExecution}
          onStarted={setStartedExecutionIds}
        />
      );
    }
    return (
      <>
        <KbnInfoCallout
          size="s"
          title={i18n.translate('xpack.contextEngine.aiIndexDetail.dreaming.notSetUpTitle', {
            defaultMessage:
              'Dreaming is not set up. Choose what this AI index learns from its memories.',
          })}
          data-test-subj="contextAiIndexDreamingNotSetUp"
        />
        <EuiSpacer size="m" />
        <EuiButton
          size="s"
          onClick={() => navigateToContextEngine(getAiIndexDreamingTemplatePath(aiIndex.id))}
          data-test-subj="contextAiIndexDreamingSetUp"
        >
          {i18n.translate('xpack.contextEngine.aiIndexDetail.dreaming.setUp', {
            defaultMessage: 'Set up dreaming',
          })}
        </EuiButton>
      </>
    );
  };

  return (
    <>
      <SettingsPanel
        data-test-subj="contextAiIndexDreamingPanel"
        title={
          <FormattedMessage
            id="xpack.contextEngine.aiIndexDetail.dreaming.title"
            defaultMessage="Dreaming"
          />
        }
        headerAction={
          <EuiButtonEmpty
            size="s"
            iconType="code"
            onClick={() => setIsJsonOpen(true)}
            data-test-subj="contextAiIndexDreamingViewJson"
          >
            {i18n.translate('xpack.contextEngine.aiIndexDetail.dreaming.viewJson', {
              defaultMessage: 'View JSON',
            })}
          </EuiButtonEmpty>
        }
      >
        {renderContent()}
      </SettingsPanel>
      {isJsonOpen && <DreamingJsonModal dreaming={dreaming} onClose={() => setIsJsonOpen(false)} />}
    </>
  );
};
