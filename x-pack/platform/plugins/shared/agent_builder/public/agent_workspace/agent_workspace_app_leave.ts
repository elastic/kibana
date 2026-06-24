/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OverlayStart } from '@kbn/core/public';
import {
  AppLeaveActionType,
  type AppLeaveActionFactory,
  type AppLeaveConfirmAction,
  type AppLeaveHandler,
} from '@kbn/core-application-browser';

const appLeaveActionFactory: AppLeaveActionFactory = {
  confirm(text, title, callback, confirmButtonText, buttonColor) {
    return {
      type: AppLeaveActionType.confirm,
      text,
      title,
      confirmButtonText,
      buttonColor,
      callback,
    };
  },
  default() {
    return { type: AppLeaveActionType.default };
  },
};

const isConfirmAction = (action: { type: AppLeaveActionType }): action is AppLeaveConfirmAction =>
  action.type === AppLeaveActionType.confirm;

const getLeaveAction = (handler?: AppLeaveHandler, nextAppId?: string) => {
  if (!handler) {
    return appLeaveActionFactory.default();
  }

  return handler(appLeaveActionFactory, nextAppId);
};

let redirectMountLeaveHandler: AppLeaveHandler | undefined;
let mountLeaveHandler: AppLeaveHandler | undefined;

/** Stores onAppLeave from a brief agent_builder application mount (deep-link redirect). */
export const setAgentWorkspaceRedirectLeaveHandler = (handler: AppLeaveHandler): void => {
  redirectMountLeaveHandler = handler;
};

export const clearAgentWorkspaceRedirectLeaveHandler = (): void => {
  redirectMountLeaveHandler = undefined;
};

/** Stores onAppLeave from the agent workspace column mount. */
export const setAgentWorkspaceMountLeaveHandler = (handler: AppLeaveHandler | undefined): void => {
  mountLeaveHandler = handler;
};

export const clearAgentWorkspaceMountLeaveHandler = (): void => {
  mountLeaveHandler = undefined;
};

export const clearAgentWorkspaceLeaveHandlers = (): void => {
  redirectMountLeaveHandler = undefined;
  mountLeaveHandler = undefined;
};

const getActiveAgentWorkspaceLeaveHandler = (): AppLeaveHandler | undefined =>
  mountLeaveHandler ?? redirectMountLeaveHandler;

/**
 * Prompts when AB streaming would be interrupted by orchestrated cross-app navigation.
 */
export const confirmAgentWorkspaceLeaveIfNeeded = async (
  overlays: OverlayStart,
  nextAppId?: string
): Promise<boolean> => {
  const handler = getActiveAgentWorkspaceLeaveHandler();
  const action = getLeaveAction(handler, nextAppId);

  if (!isConfirmAction(action)) {
    return true;
  }

  const confirmed = await overlays.openConfirm(action.text, {
    title: action.title,
    'data-test-subj': 'agentWorkspaceLeaveConfirmModal',
    confirmButtonText: action.confirmButtonText,
    buttonColor: action.buttonColor,
  });

  if (!confirmed && action.callback) {
    setTimeout(action.callback, 0);
  }

  return confirmed;
};
