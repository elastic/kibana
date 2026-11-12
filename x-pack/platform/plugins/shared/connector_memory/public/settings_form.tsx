/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiConfirmModal,
  EuiFieldNumber,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiRadioGroup,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import type { ConnectorFlyoutTabChanges } from '@kbn/triggers-actions-ui-plugin/public';
import type {
  ConnectorSettingsBody,
  ContentSourceHint,
  CrawlScheduleStatus,
  CrawlSettings,
  LearnSettings,
} from '../common/types';
import { messageOf, type ConnectorMemoryApi } from './api';

type Choice = 'off' | LearnSettings['reach'];

const RANGE = {
  files: { min: 1, max: 500 },
  depth: { min: 0, max: 6 },
  crawlFiles: { min: 1, max: 5000 },
  crawlDepth: { min: 0, max: 10 },
  interval: { min: 15, max: 10080 },
};
const INTERVALS = [
  {
    minutes: 60,
    text: i18n.translate('xpack.connectorMemory.crawl.hourly', { defaultMessage: 'Every hour' }),
  },
  {
    minutes: 360,
    text: i18n.translate('xpack.connectorMemory.crawl.sixHours', {
      defaultMessage: 'Every 6 hours',
    }),
  },
  {
    minutes: 1440,
    text: i18n.translate('xpack.connectorMemory.crawl.daily', { defaultMessage: 'Every day' }),
  },
  {
    minutes: 10080,
    text: i18n.translate('xpack.connectorMemory.crawl.weekly', { defaultMessage: 'Every week' }),
  },
];

const inRange = (value: number, { min, max }: { min: number; max: number }) =>
  Number.isInteger(value) && value >= min && value <= max;
const rangeError = ({ min, max }: { min: number; max: number }) =>
  i18n.translate('xpack.connectorMemory.form.rangeError', {
    defaultMessage: 'Use a whole number from {min} to {max}.',
    values: { min, max },
  });

/** What the crawl section edits. Numbers may be NaN while a field is empty. */
interface CrawlDraft {
  enabled: boolean;
  folder: string;
  maxDepth: number;
  maxFiles: number;
  mode: CrawlSettings['mode'];
  inferenceConnectorId: string;
  intervalMinutes: number;
}

const OFF: CrawlDraft = {
  enabled: false,
  folder: '',
  maxDepth: 2,
  maxFiles: 100,
  mode: 'names',
  inferenceConnectorId: '',
  intervalMinutes: 1440,
};

const draftOf = (crawl: CrawlSettings | undefined): CrawlDraft =>
  crawl
    ? {
        enabled: true,
        folder: crawl.folder ?? '',
        maxDepth: crawl.maxDepth,
        maxFiles: crawl.maxFiles,
        mode: crawl.mode,
        inferenceConnectorId: crawl.inferenceConnectorId ?? '',
        intervalMinutes: crawl.intervalMinutes,
      }
    : OFF;

const crawlOf = (draft: CrawlDraft): CrawlSettings => ({
  ...(draft.folder.trim() !== '' && { folder: draft.folder.trim() }),
  maxDepth: draft.maxDepth,
  maxFiles: draft.maxFiles,
  mode: draft.mode,
  ...(draft.mode === 'full' &&
    draft.inferenceConnectorId !== '' && { inferenceConnectorId: draft.inferenceConnectorId }),
  intervalMinutes: draft.intervalMinutes,
});

interface SettingsFormProps {
  api: ConnectorMemoryApi;
  connectorId: string;
  /** The connector's starting-location hint; absent when it cannot be crawled. */
  contentSource?: ContentSourceHint;
  /** What is in force now; the form starts from it. */
  settings: LearnSettings;
  /** True when an admin has saved choices for this connector. */
  customized: boolean;
  /** False when scheduled crawls are not available here; the crawl section is then left out. */
  crawlEnabled: boolean;
  schedule: CrawlScheduleStatus | null;
  isReadOnly: boolean;
  /** Told whenever there are unsaved changes, so the flyout's Save can save them. */
  onChanges?: (changes: ConnectorFlyoutTabChanges | null) => void;
}

/** What the connector learns from reads, and (where available) its scheduled crawl, saved with the flyout's Save. */
export const SettingsForm = ({
  api,
  connectorId,
  contentSource,
  settings,
  customized,
  crawlEnabled,
  schedule,
  isReadOnly,
  onChanges,
}: SettingsFormProps) => {
  const queryClient = useQueryClient();
  const ids = {
    radio: useGeneratedHtmlId({ prefix: 'connectorMemoryLearn' }),
    mode: useGeneratedHtmlId({ prefix: 'connectorMemoryMode' }),
    reset: useGeneratedHtmlId({ prefix: 'connectorMemoryReset' }),
  };
  const needsFolder = contentSource?.required === true;

  const initial: Choice = settings.learn === 'off' ? 'off' : settings.reach;
  const [choice, setChoice] = useState<Choice>(initial);
  const [maxFiles, setMaxFiles] = useState(settings.area.maxFiles);
  const [maxDepth, setMaxDepth] = useState(settings.area.maxDepth);
  const [summarize, setSummarize] = useState(settings.summarizeReads);
  const savedCrawl = draftOf(schedule?.crawl);
  const [crawl, setCrawl] = useState(savedCrawl);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const setCrawlField = (change: Partial<CrawlDraft>) =>
    setCrawl((current) => ({ ...current, ...change }));

  const crawlChanged = crawlEnabled && JSON.stringify(crawl) !== JSON.stringify(savedCrawl);
  const changed =
    crawlChanged ||
    choice !== initial ||
    maxFiles !== settings.area.maxFiles ||
    maxDepth !== settings.area.maxDepth ||
    summarize !== settings.summarizeReads;
  const valid =
    inRange(maxFiles, RANGE.files) &&
    inRange(maxDepth, RANGE.depth) &&
    (!crawlEnabled ||
      !crawl.enabled ||
      ((!needsFolder || crawl.folder.trim() !== '') &&
        inRange(crawl.maxFiles, RANGE.crawlFiles) &&
        inRange(crawl.maxDepth, RANGE.crawlDepth) &&
        inRange(crawl.intervalMinutes, RANGE.interval)));

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['connectorMemory'] });
  const save = useMutation({
    mutationFn: (body: ConnectorSettingsBody) => api.saveSettings(connectorId, body),
    onSuccess: refresh,
  });
  const reset = useMutation({
    mutationFn: () => api.resetSettings(connectorId),
    onSuccess: () => {
      setConfirmingReset(false);
      return refresh();
    },
  });
  const runNow = useMutation({ mutationFn: () => api.runCrawl(connectorId), onSuccess: refresh });
  const { data: models = [], error: modelsError } = useQuery({
    queryKey: ['connectorMemory', 'models'],
    queryFn: () => api.listModels(),
    enabled: crawlEnabled && crawl.enabled && crawl.mode === 'full',
  });

  const body: ConnectorSettingsBody = {
    ...(choice === 'off'
      ? { learn: 'off' }
      : { learn: 'reads', reach: choice, area: { maxFiles, maxDepth }, summarizeReads: summarize }),
    // The crawl is sent only when it changed: sending it saves its workflow again, as the person who saved.
    ...(crawlChanged && { crawl: crawl.enabled ? crawlOf(crawl) : null }),
  };

  // The flyout's Save button saves these changes along with the connector. Always call the latest closures.
  const latest = useRef({ save: async () => {} });
  latest.current = { save: async () => void (await save.mutateAsync(body)) };
  const report = useRef(onChanges);
  report.current = onChanges;
  useEffect(() => {
    report.current?.({
      isDirty: changed && !isReadOnly,
      isValid: valid,
      save: () => latest.current.save(),
    });
  }, [changed, valid, isReadOnly]);
  useEffect(() => () => report.current?.(null), []);

  const error = save.error ?? reset.error ?? runNow.error;
  const reaches = choice === 'siblings' || choice === 'area';
  const option = (id: Choice, label: string, help: string) => ({
    id,
    label: (
      <>
        <strong>{label}</strong>
        <EuiText size="xs" color="subdued">
          {help}
        </EuiText>
      </>
    ),
  });
  return (
    <div data-test-subj="connectorMemorySettingsForm">
      <EuiFormRow
        label={i18n.translate('xpack.connectorMemory.form.learnLabel', {
          defaultMessage: 'What data should we remember?',
        })}
        fullWidth
      >
        <EuiRadioGroup
          name={ids.radio}
          idSelected={choice}
          disabled={isReadOnly}
          onChange={(id) => setChoice(id as Choice)}
          options={[
            option(
              'off',
              i18n.translate('xpack.connectorMemory.form.off', { defaultMessage: 'Nothing' }),
              i18n.translate('xpack.connectorMemory.form.offHelp', {
                defaultMessage: 'Agents can still use this connector. Nothing is remembered.',
              })
            ),
            option(
              'direct',
              i18n.translate('xpack.connectorMemory.form.direct', {
                defaultMessage: 'Only direct hits',
              }),
              i18n.translate('xpack.connectorMemory.form.directHelp', {
                defaultMessage: 'When an agent reads data, we remember what it read.',
              })
            ),
            option(
              'siblings',
              i18n.translate('xpack.connectorMemory.form.siblings', {
                defaultMessage: 'Direct hits plus neighbors',
              }),
              i18n.translate('xpack.connectorMemory.form.siblingsHelp', {
                defaultMessage:
                  'An agent finds content near the direct hits, and we remember those also.',
              })
            ),
            option(
              'area',
              i18n.translate('xpack.connectorMemory.form.area', {
                defaultMessage: 'Direct hits plus area',
              }),
              i18n.translate('xpack.connectorMemory.form.areaHelp', {
                defaultMessage:
                  'An agent finds content around the direct hits and a few levels around it (a limited crawl).',
              })
            ),
          ]}
        />
      </EuiFormRow>

      {reaches && (
        <>
          <EuiSpacer size="m" />
          <EuiFlexGroup gutterSize="m" responsive={false} wrap>
            <EuiFlexItem grow={false}>
              <EuiFormRow
                label={i18n.translate('xpack.connectorMemory.form.maxFiles', {
                  defaultMessage: 'Most files to remember around a read',
                })}
                isInvalid={!inRange(maxFiles, RANGE.files)}
                error={rangeError(RANGE.files)}
              >
                <EuiFieldNumber
                  data-test-subj="connectorMemoryMaxFiles"
                  min={RANGE.files.min}
                  max={RANGE.files.max}
                  value={Number.isNaN(maxFiles) ? '' : maxFiles}
                  disabled={isReadOnly}
                  isInvalid={!inRange(maxFiles, RANGE.files)}
                  onChange={(event) => setMaxFiles(event.target.valueAsNumber)}
                />
              </EuiFormRow>
            </EuiFlexItem>
            {choice === 'area' && (
              <EuiFlexItem grow={false}>
                <EuiFormRow
                  label={i18n.translate('xpack.connectorMemory.form.maxDepth', {
                    defaultMessage: 'Folder levels below',
                  })}
                  isInvalid={!inRange(maxDepth, RANGE.depth)}
                  error={rangeError(RANGE.depth)}
                >
                  <EuiFieldNumber
                    data-test-subj="connectorMemoryMaxDepth"
                    min={RANGE.depth.min}
                    max={RANGE.depth.max}
                    value={Number.isNaN(maxDepth) ? '' : maxDepth}
                    disabled={isReadOnly}
                    isInvalid={!inRange(maxDepth, RANGE.depth)}
                    onChange={(event) => setMaxDepth(event.target.valueAsNumber)}
                  />
                </EuiFormRow>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </>
      )}

      <EuiSpacer size="m" />
      <EuiSwitch
        data-test-subj="connectorMemorySummarize"
        label={i18n.translate('xpack.connectorMemory.form.summarize', {
          defaultMessage: 'Summarize what agents read',
        })}
        checked={choice !== 'off' && summarize}
        disabled={isReadOnly || choice === 'off'}
        onChange={(event) => setSummarize(event.target.checked)}
      />
      <EuiText size="xs" color="subdued">
        {i18n.translate('xpack.connectorMemory.form.summarizeHelp', {
          defaultMessage:
            'Uses a model to write a short summary of each file read: one model call each, within the daily allowance.',
        })}
      </EuiText>

      {crawlEnabled && (
        <>
          <EuiSpacer size="l" />
          <div data-test-subj="connectorMemoryCrawl">
            <EuiSwitch
              data-test-subj="connectorMemoryCrawlEnabled"
              label={i18n.translate('xpack.connectorMemory.crawl.enabled', {
                defaultMessage: 'Pre-load in the background, and refresh on a schedule',
              })}
              checked={crawl.enabled}
              disabled={isReadOnly}
              onChange={(event) => setCrawlField({ enabled: event.target.checked })}
            />
            <EuiText size="xs" color="subdued">
              {i18n.translate('xpack.connectorMemory.crawl.enabledHelp', {
                defaultMessage:
                  'Without waiting for an agent, files are read in the background and remembered, then refreshed on the schedule. It runs with your access, so it can only remember what you can open.',
              })}
            </EuiText>
            {crawl.enabled && (
              <>
                <EuiSpacer size="m" />
                <EuiFormRow
                  label={i18n.translate('xpack.connectorMemory.crawl.folder', {
                    defaultMessage: 'Start from',
                  })}
                  isInvalid={needsFolder && crawl.folder.trim() === ''}
                  error={i18n.translate('xpack.connectorMemory.crawl.folderError', {
                    defaultMessage: 'This connector needs a starting location.',
                  })}
                >
                  <EuiFieldText
                    data-test-subj="connectorMemoryCrawlFolder"
                    value={crawl.folder}
                    placeholder={contentSource?.example}
                    disabled={isReadOnly}
                    isInvalid={needsFolder && crawl.folder.trim() === ''}
                    onChange={(event) => setCrawlField({ folder: event.target.value })}
                  />
                </EuiFormRow>
                <EuiFlexGroup gutterSize="m" responsive={false} wrap>
                  <EuiFlexItem grow={false}>
                    <EuiFormRow
                      label={i18n.translate('xpack.connectorMemory.crawl.depth', {
                        defaultMessage: 'Folder levels to read',
                      })}
                      isInvalid={!inRange(crawl.maxDepth, RANGE.crawlDepth)}
                      error={rangeError(RANGE.crawlDepth)}
                    >
                      <EuiFieldNumber
                        data-test-subj="connectorMemoryCrawlDepth"
                        min={RANGE.crawlDepth.min}
                        max={RANGE.crawlDepth.max}
                        value={Number.isNaN(crawl.maxDepth) ? '' : crawl.maxDepth}
                        disabled={isReadOnly}
                        isInvalid={!inRange(crawl.maxDepth, RANGE.crawlDepth)}
                        onChange={(event) =>
                          setCrawlField({ maxDepth: event.target.valueAsNumber })
                        }
                      />
                    </EuiFormRow>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiFormRow
                      label={i18n.translate('xpack.connectorMemory.crawl.maxFiles', {
                        defaultMessage: 'Most files per run',
                      })}
                      isInvalid={!inRange(crawl.maxFiles, RANGE.crawlFiles)}
                      error={rangeError(RANGE.crawlFiles)}
                    >
                      <EuiFieldNumber
                        data-test-subj="connectorMemoryCrawlMaxFiles"
                        min={RANGE.crawlFiles.min}
                        max={RANGE.crawlFiles.max}
                        value={Number.isNaN(crawl.maxFiles) ? '' : crawl.maxFiles}
                        disabled={isReadOnly}
                        isInvalid={!inRange(crawl.maxFiles, RANGE.crawlFiles)}
                        onChange={(event) =>
                          setCrawlField({ maxFiles: event.target.valueAsNumber })
                        }
                      />
                    </EuiFormRow>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiFormRow
                      label={i18n.translate('xpack.connectorMemory.crawl.interval', {
                        defaultMessage: 'Refresh',
                      })}
                    >
                      <EuiSelect
                        data-test-subj="connectorMemoryCrawlInterval"
                        options={INTERVALS.map(({ minutes, text }) => ({ value: minutes, text }))}
                        value={crawl.intervalMinutes}
                        disabled={isReadOnly}
                        onChange={(event) =>
                          setCrawlField({ intervalMinutes: Number(event.target.value) })
                        }
                      />
                    </EuiFormRow>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiFormRow
                  label={i18n.translate('xpack.connectorMemory.crawl.mode', {
                    defaultMessage: 'What to remember about each file',
                  })}
                >
                  <EuiRadioGroup
                    name={ids.mode}
                    idSelected={crawl.mode}
                    disabled={isReadOnly}
                    onChange={(id) => setCrawlField({ mode: id as CrawlDraft['mode'] })}
                    options={[
                      {
                        id: 'names',
                        label: i18n.translate('xpack.connectorMemory.crawl.modeNames', {
                          defaultMessage:
                            'Names only: every kind of file, nothing is read (fastest)',
                        }),
                      },
                      {
                        id: 'full',
                        label: i18n.translate('xpack.connectorMemory.crawl.modeFull', {
                          defaultMessage: 'Summaries of text files (one model call per file)',
                        }),
                      },
                    ]}
                  />
                </EuiFormRow>
                {crawl.mode === 'full' && (
                  <EuiFormRow
                    label={i18n.translate('xpack.connectorMemory.crawl.model', {
                      defaultMessage: 'Model that writes the summaries',
                    })}
                    isInvalid={Boolean(modelsError)}
                    helpText={
                      modelsError
                        ? i18n.translate('xpack.connectorMemory.crawl.modelsError', {
                            defaultMessage: 'The models could not be listed: {reason}',
                            values: { reason: messageOf(modelsError) },
                          })
                        : undefined
                    }
                  >
                    <EuiSelect
                      isInvalid={Boolean(modelsError)}
                      data-test-subj="connectorMemoryCrawlModel"
                      options={[
                        {
                          value: '',
                          text: i18n.translate('xpack.connectorMemory.crawl.modelDefault', {
                            defaultMessage: 'Server default',
                          }),
                        },
                        ...models.map(({ id, name }) => ({ value: id, text: name })),
                        // A model saved earlier that is no longer listed stays selectable by its id.
                        ...(crawl.inferenceConnectorId !== '' &&
                        !models.some(({ id }) => id === crawl.inferenceConnectorId)
                          ? [
                              {
                                value: crawl.inferenceConnectorId,
                                text: crawl.inferenceConnectorId,
                              },
                            ]
                          : []),
                      ]}
                      value={crawl.inferenceConnectorId}
                      disabled={isReadOnly}
                      onChange={(event) =>
                        setCrawlField({ inferenceConnectorId: event.target.value })
                      }
                    />
                  </EuiFormRow>
                )}
                {schedule?.lastRun && (
                  <EuiText size="xs" color="subdued" data-test-subj="connectorMemoryCrawlLastRun">
                    {i18n.translate('xpack.connectorMemory.crawl.lastRun', {
                      defaultMessage: 'Last run {when}: {status}.',
                      values: {
                        when: new Date(schedule.lastRun.at).toLocaleString(),
                        status: schedule.lastRun.status,
                      },
                    })}
                  </EuiText>
                )}
                {schedule && !crawlChanged && !isReadOnly && (
                  <>
                    <EuiSpacer size="s" />
                    <EuiButton
                      size="s"
                      data-test-subj="connectorMemoryCrawlRunNow"
                      isLoading={runNow.isLoading}
                      onClick={() => runNow.mutate()}
                    >
                      {i18n.translate('xpack.connectorMemory.crawl.runNow', {
                        defaultMessage: 'Run now',
                      })}
                    </EuiButton>
                    {runNow.isSuccess && (
                      <EuiText
                        size="xs"
                        color="subdued"
                        data-test-subj="connectorMemoryCrawlStarted"
                      >
                        {i18n.translate('xpack.connectorMemory.crawl.started', {
                          defaultMessage:
                            'Started. Its progress shows in the workflow’s executions.',
                        })}
                      </EuiText>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </>
      )}

      <EuiSpacer size="m" />
      {error !== null && error !== undefined && (
        <>
          <KbnDangerCallout
            data-test-subj="connectorMemoryFormError"
            title={i18n.translate('xpack.connectorMemory.form.errorTitle', {
              defaultMessage: 'The change could not be saved',
            })}
          >
            {messageOf(error)}
          </KbnDangerCallout>
          <EuiSpacer size="m" />
        </>
      )}
      {isReadOnly ? (
        <EuiText size="xs" color="subdued" data-test-subj="connectorMemoryReadOnlyNote">
          {i18n.translate('xpack.connectorMemory.form.readOnly', {
            defaultMessage: 'You do not have permission to change these settings.',
          })}
        </EuiText>
      ) : (
        <EuiButtonEmpty
          size="s"
          color="danger"
          data-test-subj="connectorMemoryReset"
          isDisabled={!customized && !schedule}
          onClick={() => setConfirmingReset(true)}
        >
          {i18n.translate('xpack.connectorMemory.form.reset', {
            defaultMessage: 'Reset to defaults',
          })}
        </EuiButtonEmpty>
      )}

      {confirmingReset && (
        <EuiConfirmModal
          aria-labelledby={ids.reset}
          titleProps={{ id: ids.reset }}
          data-test-subj="connectorMemoryResetConfirm"
          title={i18n.translate('xpack.connectorMemory.form.resetTitle', {
            defaultMessage: 'Reset this connector to the defaults?',
          })}
          buttonColor="danger"
          confirmButtonText={i18n.translate('xpack.connectorMemory.form.resetConfirm', {
            defaultMessage: 'Reset',
          })}
          cancelButtonText={i18n.translate('xpack.connectorMemory.form.resetCancel', {
            defaultMessage: 'Cancel',
          })}
          isLoading={reset.isLoading}
          onCancel={() => setConfirmingReset(false)}
          onConfirm={() => reset.mutate()}
        >
          <p>
            {i18n.translate('xpack.connectorMemory.form.resetBody', {
              defaultMessage:
                'Your choices for this connector are removed, along with its scheduled crawl. What is already remembered stays.',
            })}
          </p>
        </EuiConfirmModal>
      )}
    </div>
  );
};
