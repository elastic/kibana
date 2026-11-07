/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import type { IHttpFetchError } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { getDefaultRuleType } from '../../../common/presets';
import type { BoostRule } from '../../../common/types';
import { useBoostServices } from '../../hooks/use_boost_services';
import { useBoostState } from '../../hooks/use_boost_state';
import { ProjectDefaultFlyout } from '../project_defaults/project_default_flyout';
import { RuleFlyout } from '../rules/rule_flyout';
import { notifyRequestError } from '../error_details';
import { EXPLANATION_ERROR_LABEL } from './explanation_status';

interface EditRuleFlyoutProps {
  rule: BoostRule;
  /** The flyout history it opens in, such as a data stream's details, which Back returns to. */
  historyKey?: symbol;
  onClose: () => void;
}

/**
 * Says why a flyout that couldn't load what it edits closes, and closes it. Opening it again tries
 * again, so its details have nothing to try again.
 */
export const useCloseOnError = (error: IHttpFetchError | null, onClose: () => void) => {
  const services = useBoostServices();
  useEffect(() => {
    if (error) {
      notifyRequestError(services, error, {
        title: EXPLANATION_ERROR_LABEL,
        description: i18n.translate('xpack.boost.indexManagement.loadErrorDescription', {
          defaultMessage: 'An error prevented search boost from loading.',
        }),
      });
      onClose();
    }
  }, [error, services, onClose]);
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
