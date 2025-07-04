/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiComboBox,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { Fragment, useCallback } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { Cluster } from '@kbn/remote-clusters-plugin/public';
import type { RemoteClusterPrivilege } from '@kbn/security-plugin-types-common';
import { euiThemeVars } from '@kbn/ui-theme';

import { RemoteClusterComboBox } from './remote_clusters_combo_box';
import type { RoleRemoteClusterPrivilege } from '../../../../../../common';
import type { RoleValidator } from '../../validate_role';

const fromOption = (option: EuiComboBoxOptionOption) => option.label;
const toOption = (value: string): EuiComboBoxOptionOption => ({ label: value });

interface Props {
  formIndex: number;
  remoteClusterPrivilege: RoleRemoteClusterPrivilege;
  remoteClusters?: Cluster[];
  availableRemoteClusterPrivileges: string[];
  onChange: (remoteClusterPrivilege: RoleRemoteClusterPrivilege) => void;
  onDelete: () => void;
  isRoleReadOnly: boolean;
  validator: RoleValidator;
}

export const RemoteClusterPrivilegesForm: React.FunctionComponent<Props> = ({
  isRoleReadOnly,
  remoteClusters = [],
  formIndex,
  validator,
  remoteClusterPrivilege,
  availableRemoteClusterPrivileges,
  onChange,
  onDelete,
}) => {
  const onCreateClusterOption = useCallback(
    (option: string) => {
      const nextClusters = ([...remoteClusterPrivilege.clusters] ?? []).concat([option]);

      onChange({
        ...remoteClusterPrivilege,
        clusters: nextClusters,
      });
    },
    [remoteClusterPrivilege, onChange]
  );

  const onClustersChange = useCallback(
    (nextOptions: EuiComboBoxOptionOption[]) => {
      const clusters = nextOptions.map(fromOption);
      onChange({
        ...remoteClusterPrivilege,
        clusters,
      });
    },
    [onChange, remoteClusterPrivilege]
  );

  const onPrivilegeChange = useCallback(
    (newPrivileges: EuiComboBoxOptionOption[]) => {
      onChange({
        ...remoteClusterPrivilege,
        privileges: newPrivileges.map(fromOption) as RemoteClusterPrivilege[],
      });
    },
    [remoteClusterPrivilege, onChange]
  );

  return (
    <Fragment>
      <EuiSpacer size="m" />
      <EuiFlexGroup
        alignItems="center"
        responsive={false}
        className="remote-cluster-privilege-form"
      >
        <EuiFlexItem>
          <EuiPanel color="subdued">
            <EuiFlexGrid
              css={css`
                grid-template-columns: repeat(2, minmax(0, 1fr));
                @media (max-width: ${euiThemeVars.euiBreakpoints.s}px) {
                  grid-template-columns: repeat(1, minmax(0, 1fr));
                }
              `}
            >
              <EuiFlexItem>
                <EuiFormRow
                  label={
                    <FormattedMessage
                      id="xpack.security.management.editRole.remoteClusterPrivilegeForm.clustersFormRowLabel"
                      defaultMessage="Remote clusters"
                    />
                  }
                  fullWidth
                  {...validator.validateRemoteClusterPrivilegeClusterField(remoteClusterPrivilege)}
                >
                  <RemoteClusterComboBox
                    data-test-subj={`remoteClusterClustersInput${formIndex}`}
                    selectedOptions={([...remoteClusterPrivilege.clusters] ?? []).map(toOption)}
                    onCreateOption={onCreateClusterOption}
                    onChange={onClustersChange}
                    isDisabled={isRoleReadOnly}
                    placeholder={i18n.translate(
                      'xpack.security.management.editRole.remoteClusterPrivilegeForm.clustersPlaceholder',
                      { defaultMessage: 'Add a remote cluster…' }
                    )}
                    remoteClusters={remoteClusters}
                    type="remote_cluster"
                    fullWidth
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFormRow
                  label={
                    <FormattedMessage
                      id="xpack.security.management.editRole.remoteClusterPrivilegeForm.privilegesFormRowLabel"
                      defaultMessage="Privileges"
                    />
                  }
                  fullWidth
                  {...validator.validateRemoteClusterPrivilegePrivilegesField(
                    remoteClusterPrivilege
                  )}
                >
                  <EuiComboBox
                    data-test-subj={`remoteClusterPrivilegesInput${formIndex}`}
                    options={availableRemoteClusterPrivileges.map(toOption)}
                    selectedOptions={remoteClusterPrivilege.privileges.map(toOption)}
                    onChange={onPrivilegeChange}
                    isDisabled={isRoleReadOnly}
                    placeholder={i18n.translate(
                      'xpack.security.management.editRole.remoteClusterPrivilegeForm.privilegesPlaceholder',
                      { defaultMessage: 'Add an action…' }
                    )}
                    fullWidth
                  />
                </EuiFormRow>
              </EuiFlexItem>
            </EuiFlexGrid>
          </EuiPanel>
        </EuiFlexItem>
        {!isRoleReadOnly && (
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              aria-label={i18n.translate(
                'xpack.security.management.editRole.remoteClusterPrivilegeForm.deleteRemoteClusterPrivilegeAriaLabel',
                { defaultMessage: 'Delete remote cluster privilege' }
              )}
              color="danger"
              onClick={onDelete}
              iconType="trash"
              data-test-subj={`deleteRemoteClusterPrivilegesButton${formIndex}`}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </Fragment>
  );
};
