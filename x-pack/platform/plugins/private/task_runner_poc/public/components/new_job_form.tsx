/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import moment from 'moment';
import { v4 as uuidv4 } from 'uuid';
import { css } from '@emotion/react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiDatePicker,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiSwitch,
  EuiTextArea,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import type { IToasts } from '@kbn/core/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import {
  DEFAULT_QUERY,
  MAX_EVERY_SECONDS,
  MAX_RUN_AT_AHEAD_MS,
  MIN_EVERY_SECONDS,
  RESULT_INDEX,
} from '../../common';
import type { TaskRunnerApi } from '../api';
import { errorMessage } from '../api';
import { queryInDiscoverUrl } from '../lib/discover';
import type { NewJobInput } from '../lib/new_job';
import { createJobBody, createdMessage, newJobErrors } from '../lib/new_job';

const DEFAULT_EVERY_SECONDS = '30';

interface NewJobFormProps {
  api: TaskRunnerApi;
  share: SharePluginStart;
  toasts: IToasts;
  projectId: string;
  canWrite: boolean;
  onCreated: () => void;
}

export const NewJobForm = ({
  api,
  share,
  toasts,
  projectId,
  canWrite,
  onCreated,
}: NewJobFormProps) => {
  const { euiTheme } = useEuiTheme();
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [repeat, setRepeat] = useState(false);
  const [every, setEvery] = useState(DEFAULT_EVERY_SECONDS);
  const [runAtEnabled, setRunAtEnabled] = useState(false);
  const [runAtMs, setRunAtMs] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const input: NewJobInput = {
    query,
    every: repeat ? every : undefined,
    runAtMs: runAtEnabled ? runAtMs : undefined,
  };
  const { errors, valid } = newJobErrors(input, Date.now());
  const trimmed = query.trim();

  const submit = async () => {
    setSubmitting(true);
    const body = createJobBody(input, `kbn-${uuidv4()}`);
    try {
      const created = await api.createJob(body);
      toasts.addSuccess(createdMessage(body, created));
      onCreated();
    } catch (error) {
      toasts.addDanger({ title: "Couldn't create the job", text: errorMessage(error) });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleRunAt = (enabled: boolean) => {
    setRunAtEnabled(enabled);
    if (enabled && runAtMs === null) {
      setRunAtMs(moment().add(5, 'minutes').startOf('minute').valueOf());
    }
  };

  const submitLabel = repeat ? 'Create scheduled job' : runAtEnabled ? 'Create job' : 'Run now';
  const submitButton = (
    <EuiButton
      fill
      iconType={repeat ? 'refresh' : runAtEnabled ? 'clock' : 'play'}
      isLoading={submitting}
      isDisabled={!canWrite || !valid || submitting}
      onClick={submit}
      data-test-subj="taskRunnerPocSubmitJob"
    >
      {submitLabel}
    </EuiButton>
  );

  return (
    <EuiForm component="form" onSubmit={(event) => event.preventDefault()}>
      <EuiFormRow
        fullWidth
        label="ES|QL query"
        helpText={`The task queries project ${projectId} with an API key for your user and writes its output to ${RESULT_INDEX}.`}
      >
        <EuiTextArea
          fullWidth
          rows={3}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          css={css`
            font-family: ${euiTheme.font.familyCode};
          `}
          data-test-subj="taskRunnerPocQuery"
        />
      </EuiFormRow>
      <EuiFlexGroup gutterSize="m" alignItems="flexStart" wrap responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiFormRow hasEmptyLabelSpace>
            <EuiSwitch
              label="Repeat every"
              checked={repeat}
              onChange={(event) => setRepeat(event.target.checked)}
              data-test-subj="taskRunnerPocRepeatSwitch"
            />
          </EuiFormRow>
        </EuiFlexItem>
        {repeat ? (
          <EuiFlexItem grow={false}>
            <EuiFormRow label="Interval" isInvalid={!!errors.every} error={errors.every}>
              <EuiFieldNumber
                value={every}
                min={MIN_EVERY_SECONDS}
                max={MAX_EVERY_SECONDS}
                step={1}
                append="seconds"
                isInvalid={!!errors.every}
                onChange={(event) => setEvery(event.target.value)}
                data-test-subj="taskRunnerPocEverySeconds"
              />
            </EuiFormRow>
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem grow={false}>
          <EuiFormRow hasEmptyLabelSpace>
            <EuiSwitch
              label="Run at"
              checked={runAtEnabled}
              onChange={(event) => toggleRunAt(event.target.checked)}
              data-test-subj="taskRunnerPocRunAtSwitch"
            />
          </EuiFormRow>
        </EuiFlexItem>
        {runAtEnabled ? (
          <EuiFlexItem grow={false}>
            <EuiFormRow
              label={repeat ? 'First occurrence' : 'Fires once at'}
              isInvalid={!!errors.runAt}
              error={errors.runAt}
              helpText="At most 30 days ahead"
            >
              <EuiDatePicker
                selected={runAtMs === null ? null : moment(runAtMs)}
                onChange={(date) => setRunAtMs(date ? date.valueOf() : null)}
                showTimeSelect
                dateFormat="MMM D, YYYY HH:mm"
                timeFormat="HH:mm"
                minDate={moment()}
                maxDate={moment().add(MAX_RUN_AT_AHEAD_MS, 'ms')}
                isInvalid={!!errors.runAt}
                data-test-subj="taskRunnerPocRunAt"
              />
            </EuiFormRow>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          {canWrite ? (
            submitButton
          ) : (
            <EuiToolTip content="You need the All privilege for Task runner (POC) to create jobs.">
              {submitButton}
            </EuiToolTip>
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            iconType="discoverApp"
            href={trimmed ? queryInDiscoverUrl(share, trimmed) : undefined}
            isDisabled={trimmed.length === 0}
            target="_blank"
            data-test-subj="taskRunnerPocQueryInDiscover"
          >
            Open query in Discover
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiForm>
  );
};
