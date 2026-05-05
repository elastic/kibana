/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiComboBox, type EuiComboBoxOptionOption, EuiHighlight, EuiText } from '@elastic/eui';
import { useRoles, type KibanaRole } from '../../../hooks/use_roles';
import { accessFlyoutAddRolesPlaceholder } from './access_i18n';

interface RolePickerProps {
  /** Role names already added to the ACL (excluded from the dropdown). */
  excludedRoles: string[];
  onAdd: (roleName: string) => void;
  isDisabled?: boolean;
}

interface RoleOption extends EuiComboBoxOptionOption<string> {
  roleData: KibanaRole;
}

const roleToOption = (role: KibanaRole): RoleOption => ({
  label: role.name,
  value: role.name,
  key: role.name,
  roleData: role,
});

export const RolePicker: React.FC<RolePickerProps> = ({ excludedRoles, onAdd, isDisabled }) => {
  const { data: roles, isLoading } = useRoles();
  const excludedSet = useMemo(() => new Set(excludedRoles), [excludedRoles]);

  const options = useMemo(
    () => (roles ?? []).filter((r) => !excludedSet.has(r.name)).map(roleToOption),
    [roles, excludedSet]
  );

  const onChange = useCallback(
    (selected: Array<EuiComboBoxOptionOption<string>>) => {
      const next = selected[0]?.value;
      if (next) onAdd(next);
    },
    [onAdd]
  );

  const renderOption = useCallback(
    (option: EuiComboBoxOptionOption<string>, searchValue: string) => {
      const { roleData } = option as RoleOption;
      return (
        <div>
          <EuiText size="s">
            <EuiHighlight search={searchValue}>{roleData.name}</EuiHighlight>
          </EuiText>
          {roleData.description ? (
            <EuiText size="xs" color="subdued">
              <EuiHighlight search={searchValue}>{roleData.description}</EuiHighlight>
            </EuiText>
          ) : null}
        </div>
      );
    },
    []
  );

  return (
    <EuiComboBox<string>
      placeholder={accessFlyoutAddRolesPlaceholder}
      prepend="Add"
      options={options}
      selectedOptions={[]}
      onChange={onChange}
      singleSelection={{ asPlainText: true }}
      isLoading={isLoading}
      isDisabled={isDisabled}
      isClearable={false}
      compressed
      renderOption={renderOption}
      rowHeight={44}
      data-test-subj="agentBuilderAclRolePicker"
    />
  );
};
