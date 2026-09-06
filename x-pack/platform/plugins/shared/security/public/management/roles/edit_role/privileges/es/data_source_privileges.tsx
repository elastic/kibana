/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import React, { Fragment, useCallback, useMemo } from 'react';

import { FormattedMessage } from '@kbn/i18n-react';
import type { RoleDataSourcePrivilege } from '@kbn/security-plugin-types-common';

import { DataSourcePrivilegeForm } from './data_source_privilege_form';
import type { Role } from '../../../../../../common';
import { isRoleReadOnly } from '../../../../../../common/model';
import type { RoleValidator } from '../../validate_role';

interface Props {
  role: Role;
  onChange: (role: Role) => void;
  onAdd: () => void;
  validator: RoleValidator;
  editable?: boolean;
}

const AVAILABLE_DATA_SOURCE_PRIVILEGES: RoleDataSourcePrivilege['privileges'] = [
  'create',
  'read_metadata',
  'delete',
  'read',
  'manage',
];

const ensureGlobalPrivilege = (role: Role): estypes.SecurityGlobalPrivilege => {
  return (
    role.elasticsearch.global ?? {
      application: {
        manage: {
          applications: [],
        },
      },
    }
  );
};

const updateGlobalWithDataSourcePrivileges = (
  role: Role,
  nextDataSourcePrivileges: RoleDataSourcePrivilege[]
): Role['elasticsearch']['global'] => {
  const currentGlobal = role.elasticsearch.global;
  const fallbackGlobal = ensureGlobalPrivilege(role);
  return { ...(currentGlobal || fallbackGlobal), data_source: nextDataSourcePrivileges };
};

export const DataSourcePrivileges = ({
  role,
  onChange,
  onAdd,
  validator,
  editable = true,
}: Props) => {
  const dataSources: RoleDataSourcePrivilege[] = role.elasticsearch.global?.data_source ?? [];

  const isRoleReadOnlyValue = useMemo(() => {
    return !editable || isRoleReadOnly(role);
  }, [editable, role]);

  const onDataSourcePrivilegeChange = useCallback(
    (privilegeIndex: number) => {
      return (updatedPrivilege: RoleDataSourcePrivilege) => {
        const current = role.elasticsearch.global?.data_source ?? [];
        const next = [...current];
        next[privilegeIndex] = updatedPrivilege;

        const nextGlobal = updateGlobalWithDataSourcePrivileges(role, next);

        onChange({
          ...role,
          elasticsearch: {
            ...role.elasticsearch,
            global: nextGlobal,
          },
        });
      };
    },
    [onChange, role]
  );

  const onDataSourcePrivilegeDelete = useCallback(
    (privilegeIndex: number) => {
      return () => {
        const current = role.elasticsearch.global?.data_source ?? [];
        const next = [...current];
        next.splice(privilegeIndex, 1);

        const nextGlobal = updateGlobalWithDataSourcePrivileges(role, next);

        onChange({
          ...role,
          elasticsearch: {
            ...role.elasticsearch,
            global: nextGlobal,
          },
        });
      };
    },
    [onChange, role]
  );

  return (
    <Fragment>
      {dataSources.map((dataSourcePrivilege: RoleDataSourcePrivilege, i: number) => (
        <DataSourcePrivilegeForm
          key={i}
          formIndex={i}
          validator={validator}
          dataSourcePrivilege={dataSourcePrivilege}
          availableDataSourcePrivileges={AVAILABLE_DATA_SOURCE_PRIVILEGES}
          onChange={onDataSourcePrivilegeChange(i)}
          onDelete={onDataSourcePrivilegeDelete(i)}
          isRoleReadOnly={isRoleReadOnlyValue}
        />
      ))}

      {editable && (
        <>
          <EuiSpacer size="m" />
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButton iconType="plusCircle" onClick={onAdd}>
                <FormattedMessage
                  id="xpack.security.management.editRole.elasticSearchPrivileges.addDataSourcePrivilegesButtonLabel"
                  defaultMessage="Add data source privilege"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
    </Fragment>
  );
};
