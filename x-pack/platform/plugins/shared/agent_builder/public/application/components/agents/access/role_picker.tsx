/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiComboBox, type EuiComboBoxOptionOption } from '@elastic/eui';
import { useRoles } from '../../../hooks/use_roles';
import { accessFlyoutAddRolesPlaceholder } from './access_i18n';

interface RolePickerProps {
  /** Role names already added to the ACL (excluded from the dropdown). */
  excludedRoles: string[];
  onAdd: (roleName: string) => void;
  isDisabled?: boolean;
}

export const RolePicker: React.FC<RolePickerProps> = ({
  excludedRoles,
  onAdd,
  isDisabled,
}) => {
  const { data: roles, isLoading } = useRoles();
  const excludedSet = useMemo(() => new Set(excludedRoles), [excludedRoles]);

  const options: Array<EuiComboBoxOptionOption<string>> = useMemo(
    () =>
      (roles ?? [])
        .filter((r) => !excludedSet.has(r.name))
        .map((r) => ({ label: r.name, value: r.name, key: r.name })),
    [roles, excludedSet]
  );

  const onChange = useCallback(
    (selected: Array<EuiComboBoxOptionOption<string>>) => {
      const next = selected[0]?.value;
      if (next) {
        onAdd(next);
      }
    },
    [onAdd]
  );

  return (
    <EuiComboBox<string>
      placeholder={accessFlyoutAddRolesPlaceholder}
      options={options}
      selectedOptions={[]}
      onChange={onChange}
      singleSelection={{ asPlainText: true }}
      isLoading={isLoading}
      isDisabled={isDisabled}
      isClearable={false}
      data-test-subj="agentBuilderAclRolePicker"
    />
  );
};
