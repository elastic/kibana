/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// PROTOTYPE: package vars rendered with the stock Fleet field component
// (PackagePolicyInputVarField), split into visible / advanced with the stock rules (isAdvancedVar:
// show_user, or required without a default; var_groups via shouldShowVar). Values are read from
// the stock package policy; edits go to the wizard's per-schema overrides map.

import React from 'react';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';

import { DATASET_VAR_NAME } from '../../../../../../../../common/constants';
import type { PackagePolicyValidationResults } from '../../../../../../../../common/services';
import {
  isVarRequiredByVarGroup,
  shouldShowVar,
} from '../../../../../../../../common/services/var_group_helpers';
import type { NewPackagePolicy, RegistryVarGroup } from '../../../../../../../types';
import { isAdvancedVar } from '../../../../../../fleet/sections/agent_policy/create_package_policy_page/services';
import { PackagePolicyInputVarField } from '../../../../../../fleet/sections/agent_policy/create_package_policy_page/components/steps/components/package_policy_input_var_field';
import { VarGroupSelector } from '../../../../../../fleet/sections/agent_policy/create_package_policy_page/components/steps/components/var_group_selector';

import type { SchemaModel, WizardVar } from './model';
import { getVarErrors, getVarValue } from './model';

export interface VarFieldContext {
  model: SchemaModel;
  packagePolicy: NewPackagePolicy;
  validationResults?: PackagePolicyValidationResults;
  showErrors: boolean;
  onChange: (path: string, value: unknown) => void;
  onVarGroupChange: (scopeKey: string, groupName: string, optionName: string) => void;
}

export const splitVars = (
  vars: WizardVar[],
  varGroups?: RegistryVarGroup[],
  selections: Record<string, string> = {}
) => {
  const visible: WizardVar[] = [];
  const advanced: WizardVar[] = [];
  vars.forEach((v) => {
    if (v.def.hide_in_deployment_modes?.includes('default')) return;
    if (varGroups?.length && !shouldShowVar(v.def.name, varGroups, selections)) return;
    // PROTOTYPE: input package children expose the routing dataset as a required visible field.
    // In a curated group the content pack expects the default dataset, so tuck it away.
    const forceAdvanced = v.def.name === DATASET_VAR_NAME;
    (forceAdvanced || isAdvancedVar(v.def, varGroups, selections) ? advanced : visible).push(v);
  });
  return { visible, advanced };
};

export const countVarErrors = (
  vars: WizardVar[],
  ctx: Pick<VarFieldContext, 'model' | 'validationResults'>
) => vars.filter((v) => getVarErrors(ctx.validationResults, ctx.model, v)?.length).length;

const isWide = (v: WizardVar) =>
  !!v.def.multi || ['yaml', 'textarea'].includes(v.def.type) || !!v.def.full_width;

export const VarFieldGrid: React.FC<{
  vars: WizardVar[];
  ctx: VarFieldContext;
  varGroups?: RegistryVarGroup[];
  selections?: Record<string, string>;
}> = ({ vars, ctx, varGroups, selections }) => {
  const { euiTheme } = useEuiTheme();
  if (!vars.length) return null;
  return (
    <div
      css={css({
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: `${euiTheme.size.s} ${euiTheme.size.m}`,
        alignItems: 'start',
      })}
    >
      {vars.map((v) => (
        <div key={v.path} css={isWide(v) ? css({ gridColumn: '1 / -1' }) : undefined}>
          <PackagePolicyInputVarField
            varDef={v.def}
            value={getVarValue(ctx.packagePolicy, ctx.model, v)}
            onChange={(value) => ctx.onChange(v.path, value)}
            errors={getVarErrors(ctx.validationResults, ctx.model, v)}
            forceShowErrors={ctx.showErrors}
            packageType={ctx.model.packageType}
            packageName={ctx.model.packageName}
            isRequiredByVarGroup={isVarRequiredByVarGroup(v.def.name, varGroups, selections)}
          />
        </div>
      ))}
    </div>
  );
};

/** Stock var_group dropdowns (hidden when a group has a single option, as in the stock form). */
export const VarGroupSelectors: React.FC<{
  scopeKey: string;
  varGroups?: RegistryVarGroup[];
  selections: Record<string, string>;
  ctx: VarFieldContext;
}> = ({ scopeKey, varGroups, selections, ctx }) => (
  <>
    {(varGroups ?? []).map((group) => (
      <VarGroupSelector
        key={group.name}
        varGroup={group}
        selectedOptionName={selections[group.name]}
        onSelectionChange={(groupName, optionName) =>
          ctx.onVarGroupChange(scopeKey, groupName, optionName)
        }
        isAgentlessEnabled={false}
        hideTitle
      />
    ))}
  </>
);
