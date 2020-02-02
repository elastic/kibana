/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as H from 'history';
import React, { Dispatch } from 'react';

import { DETECTION_ENGINE_PAGE_NAME } from '../../../../components/link_to/redirect_to_detection_engine';
import {
  deleteRules,
  duplicateRules,
  enableRules,
  Rule,
} from '../../../../containers/detection_engine/rules';
import { Action } from './reducer';

import {
  ActionToaster,
  displayErrorToast,
  displaySuccessToast,
} from '../../../../components/toasters';
import { track, METRIC_TYPE, TELEMETRY_EVENT } from '../../../../lib/telemetry';

import * as i18n from '../translations';
import { bucketRulesResponse } from './helpers';

export const editRuleAction = (rule: Rule, history: H.History) => {
  history.push(`/${DETECTION_ENGINE_PAGE_NAME}/rules/id/${rule.id}/edit`);
};

export const duplicateRulesAction = async (
  rules: Rule[],
  dispatch: React.Dispatch<Action>,
  dispatchToaster: Dispatch<ActionToaster>
) => {
  try {
    const ruleIds = rules.map(r => r.id);
    dispatch({ type: 'updateLoading', ids: ruleIds, isLoading: true });
    const duplicatedRules = await duplicateRules({ rules });
    dispatch({ type: 'refresh' });
    displaySuccessToast(
      i18n.SUCCESSFULLY_DUPLICATED_RULES(duplicatedRules.length),
      dispatchToaster
    );
  } catch (e) {
    displayErrorToast(i18n.DUPLICATE_RULE_ERROR, [e.message], dispatchToaster);
  }
};

export const exportRulesAction = async (rules: Rule[], dispatch: React.Dispatch<Action>) => {
  dispatch({ type: 'setExportPayload', exportPayload: rules });
};

export const deleteRulesAction = async (
  ids: string[],
  dispatch: React.Dispatch<Action>,
  dispatchToaster: Dispatch<ActionToaster>,
  onRuleDeleted?: () => void
) => {
  try {
    dispatch({ type: 'loading', isLoading: true });

    const response = await deleteRules({ ids });
    const { errors } = bucketRulesResponse(response);

    dispatch({ type: 'refresh' });
    if (errors.length > 0) {
      displayErrorToast(
        i18n.BATCH_ACTION_DELETE_SELECTED_ERROR(ids.length),
        errors.map(e => e.error.message),
        dispatchToaster
      );
    } else {
      // FP: See https://github.com/typescript-eslint/typescript-eslint/issues/1138#issuecomment-566929566
      onRuleDeleted?.(); // eslint-disable-line no-unused-expressions
    }
  } catch (e) {
    displayErrorToast(
      i18n.BATCH_ACTION_DELETE_SELECTED_ERROR(ids.length),
      [e.message],
      dispatchToaster
    );
  }
};

export const enableRulesAction = async (
  ids: string[],
  enabled: boolean,
  dispatch: React.Dispatch<Action>,
  dispatchToaster: Dispatch<ActionToaster>
) => {
  const errorTitle = enabled
    ? i18n.BATCH_ACTION_ACTIVATE_SELECTED_ERROR(ids.length)
    : i18n.BATCH_ACTION_DEACTIVATE_SELECTED_ERROR(ids.length);

  try {
    dispatch({ type: 'updateLoading', ids, isLoading: true });

    const response = await enableRules({ ids, enabled });
    const { rules, errors } = bucketRulesResponse(response);

    dispatch({ type: 'updateRules', rules });

    if (errors.length > 0) {
      displayErrorToast(
        errorTitle,
        errors.map(e => e.error.message),
        dispatchToaster
      );
    }

    if (rules.some(rule => rule.immutable)) {
      track(
        METRIC_TYPE.COUNT,
        enabled ? TELEMETRY_EVENT.SIEM_RULE_ENABLED : TELEMETRY_EVENT.SIEM_RULE_DISABLED
      );
    }
    if (rules.some(rule => !rule.immutable)) {
      track(
        METRIC_TYPE.COUNT,
        enabled ? TELEMETRY_EVENT.CUSTOM_RULE_ENABLED : TELEMETRY_EVENT.CUSTOM_RULE_DISABLED
      );
    }
  } catch (e) {
    displayErrorToast(errorTitle, [e.message], dispatchToaster);
    dispatch({ type: 'updateLoading', ids, isLoading: false });
  }
};
