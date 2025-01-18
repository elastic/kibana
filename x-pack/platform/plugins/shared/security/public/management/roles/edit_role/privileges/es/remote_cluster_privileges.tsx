/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiSpacer } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';

import { FormattedMessage } from '@kbn/i18n-react';
import type { Cluster } from '@kbn/remote-clusters-plugin/public';

import { RemoteClusterPrivilegesForm } from './remote_cluster_privileges_form';
import type { Role, RoleRemoteClusterPrivilege, SecurityLicense } from '../../../../../../common';
import { isRoleReadOnly } from '../../../../../../common/model';
import type { RoleValidator } from '../../validate_role';

interface Props {
  remoteClusters?: Cluster[];
  role: Role;
  availableRemoteClusterPrivileges: string[];
  license: SecurityLicense;
  onChange: (role: Role) => void;
  validator: RoleValidator;
  editable?: boolean;
}

export const RemoteClusterPrivileges: React.FunctionComponent<Props> = ({
  remoteClusters,
  license,
  availableRemoteClusterPrivileges,
  role,
  editable,
  onChange,
  validator,
}) => {
  const remoteClusterPrivileges = useMemo(() => role.elasticsearch.remote_cluster ?? [], [role]);
  const remoteClusterPrivilegesDisabled = useMemo(() => {
    const { allowRemoteClusterPrivileges } = license.getFeatures();

    return !allowRemoteClusterPrivileges;
  }, [license]);

  const isReadOnly = useMemo(
    () => !editable || isRoleReadOnly(role) || remoteClusterPrivilegesDisabled,
    [role, editable, remoteClusterPrivilegesDisabled]
  );

  const onRoleChange = useCallback(
    (remoteCluster: RoleRemoteClusterPrivilege[]) => {
      const roleDraft = {
        ...role,
        elasticsearch: {
          ...role.elasticsearch,
          remote_cluster: remoteCluster,
        },
      };

      onChange(roleDraft);
    },
    [onChange, role]
  );

  const addRemoteClusterPrivilege = useCallback(() => {
    const newRemoteClusterPrivileges = [
      ...remoteClusterPrivileges,
      {
        clusters: [],
        privileges: [],
      },
    ];

    onRoleChange(newRemoteClusterPrivileges);
  }, [onRoleChange, remoteClusterPrivileges]);

  const onRemoteClusterPrivilegeChange = useCallback(
    (privilegeIndex: number) => (updatedPrivilege: RoleRemoteClusterPrivilege) => {
      const newRemoteClusterPrivileges = [...remoteClusterPrivileges];
      newRemoteClusterPrivileges[privilegeIndex] = updatedPrivilege;

      onRoleChange(newRemoteClusterPrivileges);
    },
    [onRoleChange, remoteClusterPrivileges]
  );

  const onRemoteClusterPrivilegeDelete = useCallback(
    (privilegeIndex: number) => () => {
      const newRemoteClusterPrivileges = [...remoteClusterPrivileges];
      newRemoteClusterPrivileges.splice(privilegeIndex, 1);

      onRoleChange(newRemoteClusterPrivileges);
    },
    [onRoleChange, remoteClusterPrivileges]
  );

  return (
    <>
      {remoteClusterPrivileges.map((remoteClusterPrivilege, i) => (
        <RemoteClusterPrivilegesForm
          key={i}
          isRoleReadOnly={isReadOnly}
          formIndex={i}
          validator={validator}
          availableRemoteClusterPrivileges={availableRemoteClusterPrivileges}
          remoteClusterPrivilege={remoteClusterPrivilege}
          remoteClusters={remoteClusters}
          onChange={onRemoteClusterPrivilegeChange(i)}
          onDelete={onRemoteClusterPrivilegeDelete(i)}
        />
      ))}
      {editable && (
        <>
          <EuiSpacer size="m" />
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButton
                iconType="plusInCircle"
                onClick={addRemoteClusterPrivilege}
                disabled={remoteClusterPrivilegesDisabled}
                data-test-subj="addRemoteClusterPrivilegesButton"
              >
                <FormattedMessage
                  id="xpack.security.management.editRole.elasticSearchPrivileges.addRemoteClusterPrivilegesButtonLabel"
                  defaultMessage="Add remote cluster privilege"
                />
              </EuiButton>
            </EuiFlexItem>
            {remoteClusterPrivilegesDisabled && (
              <EuiFlexItem grow={false}>
                <EuiIconTip
                  content={
                    <FormattedMessage
                      id="xpack.security.management.editRole.elasticSearchPrivileges.remoteClusterPrivilegesLicenseMissing"
                      defaultMessage="Your license does not allow configuring remote cluster privileges"
                    />
                  }
                  position="right"
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </>
      )}
    </>
  );
};
