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

import { ActionToaster, displayErrorToast } from '../../../../components/toasters';

import * as i18n from '../translations';
import { bucketRulesResponse } from './helpers';

export const editRuleAction = (rule: Rule, history: H.History) => {
  history.push(`/${DETECTION_ENGINE_PAGE_NAME}/rules/id/${rule.id}/edit`);
};

export const runRuleAction = () => {};

export const duplicateRuleAction = async (
  rule: Rule,
  dispatch: React.Dispatch<Action>,
  dispatchToaster: Dispatch<ActionToaster>
) => {
  try {
    dispatch({ type: 'updateLoading', ids: [rule.id], isLoading: true });
    const duplicatedRule = await duplicateRules({ rules: [rule] });
    dispatch({ type: 'updateLoading', ids: [rule.id], isLoading: false });
    dispatch({ type: 'updateRules', rules: duplicatedRule, appendRuleId: rule.id });
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
  dispatchToaster: Dispatch<ActionToaster>
) => {
  try {
    dispatch({ type: 'updateLoading', ids, isLoading: true });

    const response = await deleteRules({ ids });
    const { rules, errors } = bucketRulesResponse(response);

    dispatch({ type: 'deleteRules', rules });

    if (errors.length > 0) {
      displayErrorToast(
        i18n.BATCH_ACTION_DELETE_SELECTED_ERROR(ids.length),
        errors.map(e => e.error.message),
        dispatchToaster
      );
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
  } catch (e) {
    displayErrorToast(errorTitle, [e.message], dispatchToaster);
    dispatch({ type: 'updateLoading', ids, isLoading: false });
  }
};
