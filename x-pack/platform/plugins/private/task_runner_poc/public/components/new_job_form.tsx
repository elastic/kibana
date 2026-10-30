/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { css } from '@emotion/react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiTextArea,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import type { IToasts } from '@kbn/core/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { DEFAULT_QUERY, RESULT_INDEX } from '../../common';
import type { TaskRunnerApi } from '../api';
import { errorMessage } from '../api';
import { queryInDiscoverUrl } from '../lib/discover';

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
  const [submitting, setSubmitting] = useState(false);
  const trimmed = query.trim();

  const runNow = async () => {
    setSubmitting(true);
    try {
      const created = await api.createJob({ query: trimmed, idempotencyKey: `kbn-${uuidv4()}` });
      toasts.addSuccess({
        title: `Created one-shot job ${created.jobId}`,
        text: created.taskId ? `Task ${created.taskId} is queued.` : undefined,
      });
      onCreated();
    } catch (error) {
      toasts.addDanger({ title: "Couldn't create the job", text: errorMessage(error) });
    } finally {
      setSubmitting(false);
    }
  };

  const runNowButton = (
    <EuiButton
      fill
      iconType="play"
      isLoading={submitting}
      isDisabled={!canWrite || trimmed.length === 0 || submitting}
      onClick={runNow}
      data-test-subj="taskRunnerPocRunNow"
    >
      Run now
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
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          {canWrite ? (
            runNowButton
          ) : (
            <EuiToolTip content="You need the All privilege for Task runner (POC) to create jobs.">
              {runNowButton}
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
