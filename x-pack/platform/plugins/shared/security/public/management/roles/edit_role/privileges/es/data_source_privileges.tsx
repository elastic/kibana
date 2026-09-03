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
  indexPatterns: string[];
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

const getGlobalPrivilege = (role: Role): estypes.SecurityGlobalPrivilege | undefined => {
  const { global } = role.elasticsearch;
  if (!global) {
    return undefined;
  }

  if (Array.isArray(global)) {
    return global.find((entry) => entry.data_source != null) ?? global[0];
  }

  return global;
};

const ensureGlobalPrivilege = (role: Role): estypes.SecurityGlobalPrivilege => {
  return (
    getGlobalPrivilege(role) ?? {
      application: {
        manage: {
          applications: [],
        },
      },
    }
  );
};

const updateGlobalWithDataSourcePrivileges = (
  currentGlobal: Role['elasticsearch']['global'],
  nextDataSourcePrivileges: RoleDataSourcePrivilege[],
  fallbackGlobal: estypes.SecurityGlobalPrivilege
): Role['elasticsearch']['global'] => {
  if (!currentGlobal) {
    return { ...fallbackGlobal, data_source: nextDataSourcePrivileges };
  }

  if (!Array.isArray(currentGlobal)) {
    return { ...currentGlobal, data_source: nextDataSourcePrivileges };
  }

  const existingIndex = currentGlobal.findIndex((entry) => entry.data_source != null);
  const writeIndex = existingIndex >= 0 ? existingIndex : 0;

  return currentGlobal.map((entry, index) => {
    if (index !== writeIndex) {
      return entry;
    }
    return { ...entry, data_source: nextDataSourcePrivileges };
  });
};

export const DataSourcePrivileges = ({
  role,
  indexPatterns,
  onChange,
  onAdd,
  validator,
  editable = true,
}: Props) => {
  const dataSources: RoleDataSourcePrivilege[] = useMemo(() => {
    return getGlobalPrivilege(role)?.data_source ?? [];
  }, [role]);

  const isRoleReadOnlyValue = useMemo(() => {
    return !editable || isRoleReadOnly(role);
  }, [editable, role]);

  const onDataSourcePrivilegeChange = useCallback(
    (privilegeIndex: number) => {
      return (updatedPrivilege: RoleDataSourcePrivilege) => {
        const current = getGlobalPrivilege(role)?.data_source ?? [];
        const next = [...current];
        next[privilegeIndex] = updatedPrivilege;

        const nextGlobal = updateGlobalWithDataSourcePrivileges(
          role.elasticsearch.global,
          next,
          ensureGlobalPrivilege(role)
        );

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
        const current = getGlobalPrivilege(role)?.data_source ?? [];
        const next = [...current];
        next.splice(privilegeIndex, 1);

        const nextGlobal = updateGlobalWithDataSourcePrivileges(
          role.elasticsearch.global,
          next,
          ensureGlobalPrivilege(role)
        );

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
          indexPatterns={indexPatterns}
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
