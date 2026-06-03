/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ReactNode } from 'react';
import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import { AssetImage } from '../../../../asset_image';
import {
  DEFAULT_EMPTY_PROMPT_BODY,
  DEFAULT_EMPTY_PROMPT_TITLE,
  FIND_SIGNIFICANT_EVENTS_LABEL,
} from './translations';

interface SignificantEventsDiscoveryEmptyPromptProps {
  title?: ReactNode;
  body?: ReactNode;
  onRun: () => void;
  isRunning: boolean;
  runTestSubj?: string;
}

export const SignificantEventsDiscoveryEmptyPrompt = ({
  title = DEFAULT_EMPTY_PROMPT_TITLE,
  body = DEFAULT_EMPTY_PROMPT_BODY,
  onRun,
  isRunning,
  runTestSubj,
}: SignificantEventsDiscoveryEmptyPromptProps) => (
  <EuiEmptyPrompt
    aria-live="polite"
    titleSize="xs"
    icon={<AssetImage type="significantEventsDiscovery" />}
    title={<h2>{title}</h2>}
    body={<p>{body}</p>}
    actions={
      <EuiButton
        fill
        iconType="sparkles"
        onClick={() => onRun()}
        isDisabled={isRunning}
        isLoading={isRunning}
        data-test-subj={runTestSubj}
      >
        {FIND_SIGNIFICANT_EVENTS_LABEL}
      </EuiButton>
    }
  />
);
