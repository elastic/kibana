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
  EuiToolTip,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { Fragment, useCallback } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { RoleDataSourcePrivilege } from '@kbn/security-plugin-types-common';

import type { RoleValidator } from '../../validate_role';

const fromOption = (option: EuiComboBoxOptionOption) => option.label;
const toOption = (value: string): EuiComboBoxOptionOption => ({ label: value });

interface Props {
  formIndex: number;
  dataSourcePrivilege: RoleDataSourcePrivilege;
  availableDataSourcePrivileges: RoleDataSourcePrivilege['privileges'];
  onChange: (dataSourcePrivilege: RoleDataSourcePrivilege) => void;
  onDelete: () => void;
  isRoleReadOnly: boolean;
  validator: RoleValidator;
}

export const DataSourcePrivilegeForm = ({
  formIndex,
  dataSourcePrivilege,
  availableDataSourcePrivileges,
  onChange,
  onDelete,
  isRoleReadOnly,
  validator,
}: Props) => {
  const onCreateDataSourceOption = useCallback(
    (option: string) => {
      const names = dataSourcePrivilege.names.concat([option]);
      onChange({
        ...dataSourcePrivilege,
        names,
      });
    },
    [dataSourcePrivilege, onChange]
  );

  const onDataSourceChange = useCallback(
    (newPatterns: EuiComboBoxOptionOption[]) => {
      const names = newPatterns.map(fromOption);
      onChange({
        ...dataSourcePrivilege,
        names,
      });
    },
    [dataSourcePrivilege, onChange]
  );

  const onPrivilegeChange = useCallback(
    (newPrivileges: EuiComboBoxOptionOption[]) => {
      onChange({
        ...dataSourcePrivilege,
        privileges: newPrivileges.map(fromOption),
      });
    },
    [dataSourcePrivilege, onChange]
  );

  return (
    <Fragment>
      <EuiSpacer size="m" />
      <EuiFlexGroup alignItems="center" responsive={false} className="data-source-privilege-form">
        <EuiFlexItem
          css={css`
            min-width: 330px;
          `}
        >
          <EuiPanel
            color="subdued"
            css={css`
              max-width: 100%;
            `}
          >
            <EuiFlexGrid
              css={css`
                grid-template-columns: repeat(2, minmax(0, 1fr));
              `}
            >
              <EuiFlexItem>
                <EuiFormRow
                  label={
                    <FormattedMessage
                      id="xpack.security.management.editRole.dataSourcePrivilegeForm.dataSourcesFormRowLabel"
                      defaultMessage="Data sources"
                    />
                  }
                  fullWidth
                  {...validator.validateDataSourcePrivilegeNamesField(dataSourcePrivilege)}
                >
                  <EuiComboBox
                    data-test-subj={`dataSourcesInput${formIndex}`}
                    noSuggestions
                    selectedOptions={dataSourcePrivilege.names.map(toOption)}
                    onCreateOption={onCreateDataSourceOption}
                    onChange={onDataSourceChange}
                    isDisabled={isRoleReadOnly}
                    placeholder={i18n.translate(
                      'xpack.security.management.editRole.dataSourcePrivilegeForm.dataSourcesPlaceholder',
                      { defaultMessage: 'Add a data source pattern…' }
                    )}
                    fullWidth
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFormRow
                  label={
                    <FormattedMessage
                      id="xpack.security.management.editRole.dataSourcePrivilegeForm.privilegesFormRowLabel"
                      defaultMessage="Privileges"
                    />
                  }
                  fullWidth
                  {...validator.validateDataSourcePrivilegePrivilegesField(dataSourcePrivilege)}
                >
                  <EuiComboBox
                    data-test-subj={`dataSourcePrivilegesInput${formIndex}`}
                    options={availableDataSourcePrivileges.map(toOption)}
                    selectedOptions={dataSourcePrivilege.privileges.map(toOption)}
                    onChange={onPrivilegeChange}
                    isDisabled={isRoleReadOnly}
                    placeholder={i18n.translate(
                      'xpack.security.management.editRole.dataSourcePrivilegeForm.privilegesPlaceholder',
                      { defaultMessage: 'Add a privilege…' }
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
            <EuiToolTip
              content={i18n.translate(
                'xpack.security.management.editRole.dataSourcePrivilegeForm.deleteDataSourcePrivilegeAriaLabel',
                { defaultMessage: 'Delete data source privilege' }
              )}
              disableScreenReaderOutput
            >
              <EuiButtonIcon
                aria-label={i18n.translate(
                  'xpack.security.management.editRole.dataSourcePrivilegeForm.deleteDataSourcePrivilegeAriaLabel',
                  { defaultMessage: 'Delete data source privilege' }
                )}
                color={'danger'}
                onClick={onDelete}
                iconType={'trash'}
              />
            </EuiToolTip>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </Fragment>
  );
};
