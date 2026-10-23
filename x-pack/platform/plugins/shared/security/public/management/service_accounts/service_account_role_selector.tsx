/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiBadge, EuiComboBox, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import type { Role } from '../../../common';
import { isRoleDeprecated, isRoleReserved } from '../../../common/model';

interface Props {
  id?: string;
  'aria-describedby'?: string;
  'aria-labelledby'?: string;
  availableRoles: Role[];
  selectedRoleNames: string[];
  onChange: (roles: string[]) => void;
  isInvalid: boolean;
  isDisabled: boolean;
  isLoading: boolean;
}

interface RoleOptionData {
  isDeprecated: boolean;
  isReserved: boolean;
}

type RoleOption = EuiComboBoxOptionOption<RoleOptionData>;

export const ServiceAccountRoleSelector = ({
  id,
  'aria-describedby': describedBy,
  'aria-labelledby': labelledBy,
  availableRoles,
  selectedRoleNames,
  onChange,
  isInvalid,
  isDisabled,
  isLoading,
}: Props) => {
  const selectRolesLabel = i18n.translate(
    'xpack.security.management.serviceAccounts.create.selectRolesLabel',
    { defaultMessage: 'Select roles' }
  );
  const optionForRole = (role: Role): RoleOption => ({
    label: role.name,
    'data-test-subj': `roleOption-${role.name}`,
    toolTipContent: role.description,
    value: {
      isDeprecated: isRoleDeprecated(role),
      isReserved: isRoleReserved(role),
    },
  });
  const customRoles = availableRoles.filter((role) => !isRoleReserved(role));
  const predefinedRoles = availableRoles.filter(isRoleReserved);
  const selectedOptions = selectedRoleNames.map((roleName) => {
    const role = availableRoles.find(({ name }) => name === roleName);
    return role ? optionForRole(role) : { label: roleName };
  });

  return (
    <EuiComboBox<RoleOptionData>
      id={id}
      aria-describedby={describedBy}
      aria-labelledby={labelledBy}
      data-test-subj="serviceAccountRolesSelector"
      fullWidth
      isInvalid={isInvalid}
      isDisabled={isDisabled}
      isLoading={isLoading}
      placeholder={selectRolesLabel}
      options={[
        {
          label: i18n.translate(
            'xpack.security.management.serviceAccounts.create.customRolesLabel',
            {
              defaultMessage: 'Custom roles',
            }
          ),
          options: customRoles.map(optionForRole),
        },
        {
          label: i18n.translate(
            'xpack.security.management.serviceAccounts.create.predefinedRolesLabel',
            { defaultMessage: 'Pre-defined roles' }
          ),
          options: predefinedRoles.map(optionForRole),
        },
      ]}
      selectedOptions={selectedOptions}
      onChange={(options) => onChange(options.map(({ label }) => label))}
      sortMatchesBy="none"
      rowHeight={40}
      renderOption={(option) => (
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
          <EuiFlexItem>{option.label}</EuiFlexItem>
          {option.value?.isDeprecated ? (
            <EuiFlexItem grow={false}>
              <EuiBadge color="warning">
                <FormattedMessage
                  id="xpack.security.management.serviceAccounts.create.deprecatedRoleBadge"
                  defaultMessage="deprecated"
                />
              </EuiBadge>
            </EuiFlexItem>
          ) : option.value?.isReserved ? (
            <EuiFlexItem grow={false}>
              <EuiBadge color="primary">
                <FormattedMessage
                  id="xpack.security.management.serviceAccounts.create.builtInRoleBadge"
                  defaultMessage="built-in"
                />
              </EuiBadge>
            </EuiFlexItem>
          ) : undefined}
        </EuiFlexGroup>
      )}
    />
  );
};
