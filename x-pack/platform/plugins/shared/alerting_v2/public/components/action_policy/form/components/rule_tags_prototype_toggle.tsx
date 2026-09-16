/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Design prototype control — switches Action Policy form preview states.
 * Exposed as a "Prototype settings" item in the account (user) menu,
 * with options in a nested secondary panel.
 */

import { i18n } from '@kbn/i18n';
import type { SecurityPluginStart } from '@kbn/security-plugin/public';
import React from 'react';
import useObservable from 'react-use/lib/useObservable';
import { BehaviorSubject } from 'rxjs';

export type ActionPolicyPrototypeView = 'empty' | 'ap_improv' | 'visual_chart';

/** @deprecated Use ActionPolicyPrototypeView */
export type RuleTagsPrototypeView = ActionPolicyPrototypeView;

export const RULE_TAGS_PROTOTYPE_MOCK_TAGS = [
  'production',
  'staging',
  'security',
  'observability',
  'slo',
];

const DEFAULT_VIEW: ActionPolicyPrototypeView = 'ap_improv';

const prototypeView$ = new BehaviorSubject<ActionPolicyPrototypeView>(DEFAULT_VIEW);

let hasRegisteredUserMenuLink = false;

export const getActionPolicyPrototypeView = (): ActionPolicyPrototypeView => prototypeView$.value;

export const setActionPolicyPrototypeView = (view: ActionPolicyPrototypeView): void => {
  prototypeView$.next(view);
};

export const useActionPolicyPrototypeView = (): ActionPolicyPrototypeView =>
  useObservable(prototypeView$, prototypeView$.value);

const PROTOTYPE_SETTINGS_LABEL = i18n.translate(
  'xpack.alertingV2.actionPolicy.form.prototypeSettingsLabel',
  {
    defaultMessage: 'Prototype settings',
  }
);

const PROTOTYPE_OPTIONS: Array<{
  id: ActionPolicyPrototypeView;
  label: string;
  testSubj: string;
}> = [
  {
    id: 'empty',
    label: i18n.translate('xpack.alertingV2.actionPolicy.form.prototypeEmpty', {
      defaultMessage: 'Empty state',
    }),
    testSubj: 'ruleTagsPrototypeToggle-empty',
  },
  {
    id: 'ap_improv',
    label: i18n.translate('xpack.alertingV2.actionPolicy.form.prototypeApImprov', {
      defaultMessage: 'AP improv',
    }),
    testSubj: 'ruleTagsPrototypeToggle-ap_improv',
  },
  {
    id: 'visual_chart',
    label: i18n.translate('xpack.alertingV2.actionPolicy.form.prototypeVisualChart', {
      defaultMessage: 'Visual chart',
    }),
    testSubj: 'ruleTagsPrototypeToggle-visual_chart',
  },
];

const PrototypeOptionLabel = ({
  optionId,
  label,
}: {
  optionId: ActionPolicyPrototypeView;
  label: string;
}) => {
  const selectedView = useActionPolicyPrototypeView();
  return (
    <>
      {label}
      {selectedView === optionId ? ' ✓' : ''}
    </>
  );
};

/**
 * Registers the prototype settings entry in the account (user) menu once.
 * Options open in a nested secondary context-menu panel.
 */
export const registerActionPolicyPrototypeUserMenuLink = (
  security: SecurityPluginStart
): void => {
  if (hasRegisteredUserMenuLink) {
    return;
  }
  hasRegisteredUserMenuLink = true;

  security.navControlService.addUserMenuLinks([
    {
      label: PROTOTYPE_SETTINGS_LABEL,
      iconType: 'controlsHorizontal',
      href: '',
      order: 50,
      panelItems: PROTOTYPE_OPTIONS.map((option) => ({
        name: <PrototypeOptionLabel optionId={option.id} label={option.label} />,
        onClick: () => setActionPolicyPrototypeView(option.id),
        'data-test-subj': option.testSubj,
      })),
    },
  ]);
};

/** @deprecated Prefer user-menu registration; kept for type re-exports. */
export const ActionPolicyPrototypeToggle = () => null;

/** @deprecated Use ActionPolicyPrototypeToggle */
export const RuleTagsPrototypeToggle = ActionPolicyPrototypeToggle;
