/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCode,
  EuiDescriptionList,
  EuiLink,
  EuiLoadingSpinner,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Capabilities } from '@kbn/core/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { WorkflowRunRequest } from '../runtime/app_runtime';
import { DataLayerContext } from '../data/data_layer_context';
import { getServices } from '../services';
import { createWorkflowClient, type WorkflowClient, type WorkflowSummary } from './workflow_client';

/** The id of the Workflows application, which an execution is looked at in. */
const WORKFLOWS_APPLICATION_ID = 'workflows';
const MAX_SHOWN_VALUE_LENGTH = 200;
const MAX_SHOWN_STEPS = 10;

type Steps = NonNullable<NonNullable<WorkflowSummary['definition']>['steps']>;

/** Whether a step holds steps of its own, as one that loops or branches does. */
const hasNestedSteps = (steps: Steps): boolean =>
  steps.some((step) =>
    Object.values(step).some(
      (value) =>
        Array.isArray(value) &&
        value.length > 0 &&
        value.every((item) => typeof item === 'object' && item !== null && 'type' in item)
    )
  );

export type WorkflowAvailability = { canRun: true } | { canRun: false; reason: string };

/**
 * Whether the user may run workflows, and if not, why: a feature that is not there at all (the
 * license, or the space) is not a role that lacks a privilege, and the reason should not say so.
 */
export const getWorkflowAvailability = (capabilities: Capabilities): WorkflowAvailability => {
  const workflows = capabilities.workflowsManagement;
  if (!workflows) {
    return {
      canRun: false,
      reason: i18n.translate('xpack.customApp.workflows.unavailable', {
        defaultMessage: 'Workflows are not available in this space or with this license.',
      }),
    };
  }
  if (workflows.executeWorkflow !== true) {
    return {
      canRun: false,
      reason: i18n.translate('xpack.customApp.workflows.noPrivilege', {
        defaultMessage: 'You need the Execute privilege of Workflows to run a workflow.',
      }),
    };
  }
  return { canRun: true };
};

/**
 * Whether a workflow an app names is there: not saved yet is `missing`, which is what an app made
 * with a draft of its workflow is until the person saves it. Anything else that goes wrong in
 * looking, such as not being allowed to read it, is `unknown` and does not stop anything: running
 * is a privilege of its own.
 */
export type WorkflowStatus = 'found' | 'missing' | 'unknown';

export interface WorkflowRunner {
  availability: WorkflowAvailability;
  /** What is known of the workflows that were asked about with `track`, by id. */
  statuses: Readonly<Record<string, WorkflowStatus>>;
  /** Finds out, once for each, whether these workflows exist, so that `statuses` can say. */
  track: (ids: readonly string[]) => void;
  /** Asks the user to confirm, then runs, the workflows an action asked for. */
  request: (requests: WorkflowRunRequest[], nodeId: string) => void;
}

/** Without a runner, nothing runs, as in anything rendered outside of the app. */
const NO_RUNNER: WorkflowRunner = {
  availability: {
    canRun: false,
    reason: i18n.translate('xpack.customApp.workflows.notHere', {
      defaultMessage: 'Workflows cannot be run from here.',
    }),
  },
  statuses: {},
  track: () => {},
  request: () => {},
};

const WorkflowRunnerContext = createContext<WorkflowRunner>(NO_RUNNER);

export const useWorkflowRunner = (): WorkflowRunner => useContext(WorkflowRunnerContext);

type Details =
  | { status: 'loading' }
  | { status: 'ready'; workflow: WorkflowSummary }
  | { status: 'error'; message: string };

const toMessage = (error: unknown): string =>
  (error as { body?: { message?: string } })?.body?.message ??
  (error instanceof Error ? error.message : String(error));

const show = (value: unknown): string => {
  const text = JSON.stringify(value);
  return text.length > MAX_SHOWN_VALUE_LENGTH ? `${text.slice(0, MAX_SHOWN_VALUE_LENGTH)}…` : text;
};

/**
 * What the workflow does, as it is written: the steps a person agrees to when they press Run. The
 * name and the description are the author's words, which can say one thing and do another; the
 * steps are what will run.
 */
const WorkflowSteps = ({ steps }: { steps: Steps | undefined }) => {
  if (!steps || steps.length === 0) return null;
  const shown = steps.slice(0, MAX_SHOWN_STEPS);

  return (
    <>
      <EuiSpacer size="s" />
      <EuiText size="xs">
        <strong>
          {i18n.translate('xpack.customApp.workflows.steps', { defaultMessage: 'What it does' })}
        </strong>
      </EuiText>
      <EuiDescriptionList
        compressed
        type="column"
        data-test-subj="customAppRunWorkflowSteps"
        listItems={shown.map((step, index) => ({
          title: step.name ?? `${index + 1}`,
          description: <EuiCode>{step.type ?? '?'}</EuiCode>,
        }))}
      />
      {(steps.length > shown.length || hasNestedSteps(steps)) && (
        <EuiText size="xs" color="subdued">
          <p>
            {steps.length > shown.length
              ? i18n.translate('xpack.customApp.workflows.moreSteps', {
                  defaultMessage: 'And {count, plural, one {# more step} other {# more steps}}.',
                  values: { count: steps.length - shown.length },
                })
              : i18n.translate('xpack.customApp.workflows.nestedSteps', {
                  defaultMessage: 'Some of these have steps of their own, which are not listed.',
                })}
          </p>
        </EuiText>
      )}
    </>
  );
};

interface ConfirmRunModalProps {
  requests: WorkflowRunRequest[];
  client: WorkflowClient;
  isRunning: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * What is about to happen, said before it does: which workflows, and what they are handed. An app
 * is written by someone else, or by an agent, so a button does nothing without this being agreed.
 */
const ConfirmRunModal = ({
  requests,
  client,
  isRunning,
  onConfirm,
  onCancel,
}: ConfirmRunModalProps) => {
  const titleId = useId();
  const [details, setDetails] = useState<Record<string, Details>>({});

  useEffect(() => {
    let isCurrent = true;
    new Set(requests.map(({ workflow }) => workflow)).forEach((id) => {
      client
        .get(id)
        .then(
          (workflow): Details =>
            workflow.enabled && workflow.valid
              ? { status: 'ready', workflow }
              : {
                  status: 'error',
                  message: workflow.enabled
                    ? i18n.translate('xpack.customApp.workflows.invalid', {
                        defaultMessage: 'This workflow is not valid, so it cannot be run.',
                      })
                    : i18n.translate('xpack.customApp.workflows.disabled', {
                        defaultMessage: 'This workflow is disabled. Enable it to run it.',
                      }),
                }
        )
        .catch(
          (error): Details => ({
            status: 'error',
            message:
              (error as { body?: { statusCode?: number } })?.body?.statusCode === 404
                ? i18n.translate('xpack.customApp.workflows.notFound', {
                    defaultMessage: 'This workflow does not exist, or you cannot see it.',
                  })
                : toMessage(error),
          })
        )
        .then((result) => {
          if (isCurrent) setDetails((current) => ({ ...current, [id]: result }));
        });
    });
    return () => {
      isCurrent = false;
    };
  }, [requests, client]);

  const loaded = requests.map(
    ({ workflow }) => details[workflow] ?? { status: 'loading' as const }
  );
  const canRun = loaded.every(({ status }) => status === 'ready');

  return (
    <EuiModal
      onClose={onCancel}
      aria-labelledby={titleId}
      data-test-subj="customAppRunWorkflowModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>
          {i18n.translate('xpack.customApp.workflows.confirmTitle', {
            defaultMessage: 'Run {count, plural, one {this workflow} other {these # workflows}}?',
            values: { count: requests.length },
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText size="s">
          <p>
            {i18n.translate('xpack.customApp.workflows.confirmBody', {
              defaultMessage:
                'It runs with your own privileges, as if you had started it from Workflows.',
            })}
          </p>
        </EuiText>
        <EuiSpacer size="m" />
        {requests.map(({ workflow, inputs }, index) => {
          const info = loaded[index];
          return (
            <EuiPanel key={`${workflow}-${index}`} hasBorder hasShadow={false} paddingSize="m">
              {info.status === 'loading' && <EuiLoadingSpinner size="m" />}
              {info.status === 'ready' && (
                <>
                  <EuiText size="s">
                    <strong>{info.workflow.name}</strong>
                    {info.workflow.description ? <p>{info.workflow.description}</p> : null}
                  </EuiText>
                  <WorkflowSteps steps={info.workflow.definition?.steps} />
                </>
              )}
              {info.status === 'error' && (
                <EuiCallOut
                  size="s"
                  color="danger"
                  title={<EuiCode>{workflow}</EuiCode>}
                  announceOnMount={false}
                >
                  <p>{info.message}</p>
                </EuiCallOut>
              )}
              <EuiSpacer size="s" />
              {Object.keys(inputs).length === 0 ? (
                <EuiText size="xs" color="subdued">
                  <p>
                    {i18n.translate('xpack.customApp.workflows.noInputs', {
                      defaultMessage: 'It is given no inputs.',
                    })}
                  </p>
                </EuiText>
              ) : (
                <EuiDescriptionList
                  compressed
                  type="column"
                  listItems={Object.entries(inputs).map(([name, value]) => ({
                    title: name,
                    description: <EuiCode>{show(value)}</EuiCode>,
                  }))}
                />
              )}
            </EuiPanel>
          );
        })}
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onCancel} isDisabled={isRunning}>
          {i18n.translate('xpack.customApp.workflows.cancel', { defaultMessage: 'Cancel' })}
        </EuiButtonEmpty>
        <EuiButton
          fill
          onClick={onConfirm}
          isLoading={isRunning}
          isDisabled={!canRun}
          data-test-subj="customAppRunWorkflowConfirm"
        >
          {i18n.translate('xpack.customApp.workflows.run', { defaultMessage: 'Run' })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};

interface Pending {
  requests: WorkflowRunRequest[];
  nodeId: string;
}

/** How long a run is followed, and how often it is asked after, to show what it changed. */
const FOLLOW_INTERVAL_MS = 1000;
const FOLLOW_LIMIT = 45;
const FINISHED = ['completed', 'failed', 'cancelled', 'timed_out', 'skipped'];

/**
 * Lets what is inside run workflows, after the user has agreed. `appId` is the saved app they come
 * from, when there is one, and is sent with each run so it can be traced to the app.
 */
export const WorkflowRunnerProvider = ({
  appId,
  children,
}: {
  appId?: string;
  children: ReactNode;
}) => {
  const { core } = getServices();
  const client = useMemo(() => createWorkflowClient(core.http), [core.http]);
  const availability = useMemo(
    () => getWorkflowAvailability(core.application.capabilities),
    [core.application.capabilities]
  );
  const [pending, setPending] = useState<Pending>();
  const [isRunning, setIsRunning] = useState(false);
  const [statuses, setStatuses] = useState<Readonly<Record<string, WorkflowStatus>>>({});
  const asked = useRef(new Set<string>());
  // A run can change what the app shows, such as the severity of a case, so when it is over the
  // app asks for its data again. Without a data layer around it, there is nothing to ask.
  const layer = useContext(DataLayerContext);
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const refreshWhenDone = useCallback(
    async (executionId: string) => {
      for (let attempt = 0; attempt < FOLLOW_LIMIT && isMounted.current; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, FOLLOW_INTERVAL_MS));
        // The app may have gone away while waiting, and then there is nothing left to refresh.
        if (!isMounted.current) return;
        try {
          const { status } = await client.execution(executionId);
          if (FINISHED.includes(status)) break;
        } catch {
          break;
        }
      }
      // Whether it ended or is still going, what is shown is asked for again once.
      if (isMounted.current) layer?.retry();
    },
    [client, layer]
  );

  const look = useCallback(
    async (id: string) => {
      let status: WorkflowStatus = 'found';
      try {
        await client.get(id);
      } catch (error) {
        status =
          (error as { body?: { statusCode?: number } })?.body?.statusCode === 404
            ? 'missing'
            : 'unknown';
      }
      setStatuses((current) => (current[id] === status ? current : { ...current, [id]: status }));
    },
    [client]
  );

  const track = useCallback(
    (ids: readonly string[]) => {
      new Set(ids).forEach((id) => {
        if (id === '' || asked.current.has(id)) return;
        asked.current.add(id);
        void look(id);
      });
    },
    [look]
  );

  // A workflow that was not saved is saved in another tab: looking again when the person comes
  // back is how the app notices, without a refresh.
  useEffect(() => {
    const onFocus = () =>
      Object.entries(statuses)
        .filter(([, status]) => status === 'missing')
        .forEach(([id]) => void look(id));
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [look, statuses]);

  const request = useCallback(
    (requests: WorkflowRunRequest[], nodeId: string) => {
      if (!availability.canRun) {
        core.notifications.toasts.addWarning({
          title: i18n.translate('xpack.customApp.workflows.cannotRunTitle', {
            defaultMessage: 'The workflow was not run',
          }),
          text: availability.reason,
        });
        return;
      }
      setPending({ requests, nodeId });
    },
    [availability, core.notifications]
  );

  const confirm = useCallback(async () => {
    if (!pending) return;
    setIsRunning(true);
    for (const { workflow, inputs } of pending.requests) {
      try {
        const { workflowExecutionId } = await client.run(workflow, {
          inputs: { ...inputs },
          metadata: {
            source: 'custom_app',
            nodeId: pending.nodeId,
            ...(appId ? { appId } : {}),
          },
        });
        void refreshWhenDone(workflowExecutionId);
        core.notifications.toasts.addSuccess({
          title: i18n.translate('xpack.customApp.workflows.started', {
            defaultMessage: 'Workflow run started',
          }),
          text: toMountPoint(
            <EuiLink
              onClick={() =>
                core.application.navigateToApp(WORKFLOWS_APPLICATION_ID, {
                  path: `/${encodeURIComponent(
                    workflow
                  )}?tab=executions&executionId=${encodeURIComponent(workflowExecutionId)}`,
                })
              }
            >
              {i18n.translate('xpack.customApp.workflows.viewExecution', {
                defaultMessage: 'View the execution',
              })}
            </EuiLink>,
            core.rendering
          ),
        });
      } catch (error) {
        core.notifications.toasts.addDanger({
          title: i18n.translate('xpack.customApp.workflows.runError', {
            defaultMessage: 'The workflow could not be run',
          }),
          text: toMessage(error),
        });
      }
    }
    setIsRunning(false);
    setPending(undefined);
  }, [appId, client, core, pending, refreshWhenDone]);

  const value = useMemo<WorkflowRunner>(
    () => ({ availability, statuses, track, request }),
    [availability, statuses, track, request]
  );

  return (
    <WorkflowRunnerContext.Provider value={value}>
      {children}
      {pending && (
        <ConfirmRunModal
          requests={pending.requests}
          client={client}
          isRunning={isRunning}
          onConfirm={confirm}
          onCancel={() => setPending(undefined)}
        />
      )}
    </WorkflowRunnerContext.Provider>
  );
};
