/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import type { IHttpFetchError } from '@kbn/core/public';
import { getDefaultRuleType } from '../../../common/presets';
import type { BoostRule } from '../../../common/types';
import { useBoostServices } from '../../hooks/use_boost_services';
import { useBoostState } from '../../hooks/use_boost_state';
import { ProjectDefaultFlyout } from '../project_defaults/project_default_flyout';
import { RuleFlyout } from '../rules/rule_flyout';
import { EXPLANATION_ERROR_LABEL } from './explanation_status';

interface EditRuleFlyoutProps {
  rule: BoostRule;
  /** The flyout history it opens in, such as a data stream's details, which Back returns to. */
  historyKey?: symbol;
  onClose: () => void;
}

/** Says why a flyout that couldn't load what it edits closes, and closes it. */
export const useCloseOnError = (error: IHttpFetchError | null, onClose: () => void) => {
  const { notifications } = useBoostServices();
  useEffect(() => {
    if (error) {
      notifications.toasts.addError(error, { title: EXPLANATION_ERROR_LABEL });
      onClose();
    }
  }, [error, notifications, onClose]);
};

/**
 * Edits a rule, or a default rule as its project default, as the boost app does. Each form starts
 * from the boost state, which the boost app always has, but Index Management may not have loaded
 * yet, so the form waits for it.
 */
export const EditRuleFlyout = ({ rule, historyKey, onClose }: EditRuleFlyoutProps) => {
  const { data: state, error } = useBoostState();
  useCloseOnError(error, onClose);
  if (!state) {
    return null;
  }
  const defaultType = rule.is_builtin ? getDefaultRuleType(rule.name) : undefined;
  return defaultType ? (
    <ProjectDefaultFlyout type={defaultType} historyKey={historyKey} onClose={onClose} />
  ) : (
    <RuleFlyout rule={rule} historyKey={historyKey} onClose={onClose} />
  );
};
