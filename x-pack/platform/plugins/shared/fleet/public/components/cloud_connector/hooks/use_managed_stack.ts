/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@kbn/react-query';

import type {
  AwsOnboardingTemplateInfo,
  CreateAwsOnboardingStackRequest,
  GetAwsOnboardingStackResponse,
  UpdateAwsOnboardingStackRequest,
} from '../../../../common/types/rest_spec/aws_onboarding';
import type { CloudConnectorIacState } from '../../../../common/types/models/cloud_connector';
import {
  sendCreateAwsOnboardingStack,
  sendGetAwsOnboardingStack,
  sendUpdateAwsOnboardingStack,
} from '../../../hooks/use_request/aws_onboarding';

export type ManagedStackPhase = 'idle' | 'starting' | 'polling' | 'complete' | 'failed';

export interface ManagedStackCompletion {
  stackId: string;
  roleArn?: string;
  /** Template details to persist on the connector; nulls when the static template was used. */
  iac: CloudConnectorIacState;
}

export interface ManagedStackState {
  phase: ManagedStackPhase;
  isRunning: boolean;
  stackId?: string;
  stackStatus?: string;
  error?: string;
  reset: () => void;
}

const POLL_INTERVAL_MS = 5000;
const MAX_ERROR_LENGTH = 500;

/**
 * Status reasons and error bodies come from AWS / the Kibana API and are shown to the user as
 * plain text (React escapes JSX text, so this is not an injection vector); still, coerce to a
 * string, drop control characters and cap the length before they reach the UI.
 */
const sanitizeMessage = (value: unknown): string =>
  String(value ?? '')
    .split('')
    .map((char) => (char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127 ? ' ' : char))
    .join('')
    .trim()
    .slice(0, MAX_ERROR_LENGTH);

const toIacState = (template: AwsOnboardingTemplateInfo | undefined): CloudConnectorIacState => ({
  iac_key: template?.templateSha ?? null,
  iac_blueprint_id: template?.blueprint?.id ?? null,
  iac_blueprint_version: template?.blueprint?.version ?? null,
});

/** Extracts the raw template URL from a CloudFormation quick-create link (the params live in the hash). */
export const getTemplateUrlFromQuickCreateUrl = (
  quickCreateUrl: string | undefined
): string | undefined => {
  if (!quickCreateUrl) return undefined;
  const match = /[?&]templateURL=([^&]+)/.exec(quickCreateUrl);
  if (!match) return undefined;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return undefined;
  }
};

/** Polls a stack until it reaches a terminal state, then fires `onComplete` or surfaces the failure once. */
const useStackLifecycle = ({
  onComplete,
}: {
  onComplete: (completion: ManagedStackCompletion) => void;
}) => {
  const [phase, setPhase] = useState<ManagedStackPhase>('idle');
  const [stackId, setStackId] = useState<string | undefined>(undefined);
  const [template, setTemplate] = useState<AwsOnboardingTemplateInfo | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const completedForRef = useRef<string | undefined>(undefined);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const { data: status } = useQuery<GetAwsOnboardingStackResponse>(
    ['aws-onboarding-stack', stackId],
    async () => {
      const { data, error: requestError } = await sendGetAwsOnboardingStack(stackId as string);
      if (requestError || !data) {
        throw requestError ?? new Error('Empty stack status response');
      }
      return data;
    },
    {
      enabled: phase === 'polling' && Boolean(stackId),
      refetchInterval: (data) => (data && data.status !== 'in_progress' ? false : POLL_INTERVAL_MS),
      refetchOnWindowFocus: false,
      retry: 2,
      onError: (e: unknown) => {
        setError(sanitizeMessage(e instanceof Error ? e.message : e));
        setPhase('failed');
      },
    }
  );

  useEffect(() => {
    if (phase !== 'polling' || !status || !stackId) return;
    if (status.status === 'in_progress') return;
    if (status.status === 'complete') {
      if (completedForRef.current !== stackId) {
        completedForRef.current = stackId;
        setPhase('complete');
        onCompleteRef.current({
          stackId,
          roleArn: status.outputs?.roleArn,
          iac: toIacState(template),
        });
      }
      return;
    }
    setError(
      status.status === 'not_found'
        ? 'The stack no longer exists (CloudFormation deletes a stack whose creation failed).'
        : sanitizeMessage(
            `${status.stackStatus ?? status.status}${status.reason ? `: ${status.reason}` : ''}`
          )
    );
    setPhase('failed');
  }, [phase, status, stackId, template]);

  const begin = useCallback((id: string, info: AwsOnboardingTemplateInfo | undefined) => {
    setError(undefined);
    setTemplate(info);
    setStackId(id);
    setPhase('polling');
  }, []);

  const fail = useCallback((message: string) => {
    setError(sanitizeMessage(message));
    setPhase('failed');
  }, []);

  const reset = useCallback(() => {
    setPhase('idle');
    setStackId(undefined);
    setTemplate(undefined);
    setError(undefined);
  }, []);

  return {
    state: {
      phase,
      isRunning: phase === 'starting' || phase === 'polling',
      stackId,
      stackStatus: status?.stackStatus,
      error,
      reset,
    } as ManagedStackState,
    setPhase,
    begin,
    fail,
  };
};

const errorMessage = (e: unknown): string =>
  (e as { body?: { message?: string } })?.body?.message ??
  (e instanceof Error ? e.message : String(e));

export const useManagedStackCreate = ({
  onComplete,
}: {
  onComplete: (completion: ManagedStackCompletion) => void;
}) => {
  const { state, setPhase, begin, fail } = useStackLifecycle({ onComplete });

  const start = useCallback(
    async (request: CreateAwsOnboardingStackRequest) => {
      setPhase('starting');
      const { data, error } = await sendCreateAwsOnboardingStack(request);
      if (error || !data) {
        fail(errorMessage(error) || 'Failed to start the CloudFormation stack');
        return;
      }
      begin(data.stackId, data.template);
    },
    [begin, fail, setPhase]
  );

  return { ...state, start };
};

export const useManagedStackUpdate = ({
  onComplete,
  onUpToDate,
}: {
  onComplete: (completion: ManagedStackCompletion) => void;
  onUpToDate?: () => void;
}) => {
  const { state, setPhase, begin, fail } = useStackLifecycle({ onComplete });

  const start = useCallback(
    async (cloudConnectorId: string, request: UpdateAwsOnboardingStackRequest) => {
      setPhase('starting');
      const { data, error } = await sendUpdateAwsOnboardingStack(cloudConnectorId, request);
      if (error || !data) {
        fail(errorMessage(error) || 'Failed to start the CloudFormation stack update');
        return;
      }
      if (data.status === 'up_to_date') {
        setPhase('complete');
        onUpToDate?.();
        return;
      }
      begin(data.stackId, data.template);
    },
    [begin, fail, onUpToDate, setPhase]
  );

  return { ...state, start };
};
