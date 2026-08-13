/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectReference } from '@kbn/core/server';
import { injectReferencesIntoActions } from '../../../rules_client/common';
import type { RawRule } from '../../../types';
import type { RuleDomain } from '../types';

interface Args {
  ruleId: string;
  actions: RawRule['actions'];
  isSystemAction: (connectorId: string) => boolean;
  references?: SavedObjectReference[];
}

export const transformRawActionsToDomainActions = ({
  actions,
  ruleId,
  references,
  isSystemAction,
}: Args): RuleDomain['actions'] => {
  const actionsWithInjectedRefs = actions
    ? injectReferencesIntoActions(ruleId, actions, references || [])
    : [];

  const ruleDomainActions = actionsWithInjectedRefs
    .filter((action) => !isSystemAction(action.id))
    .map((action) => {
      return {
        group: action.group ?? 'default',
        id: action.id,
        params: action.params,
        actionTypeId: action.actionTypeId,
        uuid: action.uuid,
        ...(action.frequency ? { frequency: action.frequency } : {}),
        ...(action.alertsFilter ? { alertsFilter: action.alertsFilter } : {}),
        ...(action.useAlertDataForTemplate
          ? { useAlertDataForTemplate: action.useAlertDataForTemplate }
          : {}),
      };
    });

  return ruleDomainActions as RuleDomain['actions'];
};

export const transformRawActionsToDomainSystemActions = ({
  actions,
  ruleId,
  references,
  isSystemAction,
}: Args): RuleDomain['systemActions'] => {
  const actionsWithInjectedRefs = actions
    ? injectReferencesIntoActions(ruleId, actions, references || [])
    : [];

  const ruleDomainSystemActions = actionsWithInjectedRefs
    .filter((action) => isSystemAction(action.id))
    .map((action) => {
      return {
        id: action.id,
        params: action.params,
        actionTypeId: action.actionTypeId,
        uuid: action.uuid,
        ...(action.useAlertDataForTemplate
          ? { useAlertDataForTemplate: action.useAlertDataForTemplate }
          : {}),
      };
    });

  return ruleDomainSystemActions;
};
