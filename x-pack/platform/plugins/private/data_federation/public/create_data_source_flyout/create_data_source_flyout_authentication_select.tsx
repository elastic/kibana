/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { EuiSpacerProps, EuiSuperSelectOption } from '@elastic/eui';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiLink,
  EuiSpacer,
  EuiSuperSelect,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import type { DataSourceType } from '../../common/datasource_types';
import {
  createDataSourceFlyoutAuthenticationLabel,
  createDataSourceFlyoutAuthenticationRecommendedBadge,
  createDataSourceFlyoutAuthenticationTitle,
  DATA_SOURCE_TYPES_WITH_AUTHENTICATION,
  getAuthenticationMethodDescription,
  getAuthenticationMethodDocumentationUrl,
  getCreateDataSourceAuthenticationOptions,
  type CreateDataSourceAuthenticationMode,
} from './create_data_source_flyout_authentication';
import { mainTranslations } from '../main_i18n';

const AuthenticationOptionLabel = ({
  text,
  isRecommended,
  isBold = false,
}: {
  text: string;
  isRecommended?: boolean;
  /** Set in the dropdown, where the label heads a description. */
  isBold?: boolean;
}) => (
  <EuiFlexGroup responsive={false} alignItems="center" gutterSize="s">
    <EuiFlexItem grow={false}>{isBold ? <strong>{text}</strong> : text}</EuiFlexItem>
    {isRecommended ? (
      <EuiFlexItem grow={false}>
        <EuiBadge color="hollow">{createDataSourceFlyoutAuthenticationRecommendedBadge()}</EuiBadge>
      </EuiFlexItem>
    ) : null}
  </EuiFlexGroup>
);

const CreateDataSourceFlyoutAuthenticationMethodDescription = ({
  dataSourceType,
  authenticationMode,
}: {
  dataSourceType: DataSourceType;
  authenticationMode: CreateDataSourceAuthenticationMode;
}) => {
  const description = useMemo(
    () => getAuthenticationMethodDescription(dataSourceType, authenticationMode),
    [authenticationMode, dataSourceType]
  );
  const documentationUrl = getAuthenticationMethodDocumentationUrl(
    dataSourceType,
    authenticationMode
  );

  if (!description) {
    return null;
  }

  return (
    <>
      <EuiSpacer size="m" />
      <EuiText
        size="s"
        color="subdued"
        data-test-subj={`createDataSourceFlyoutAuthenticationDescription-${authenticationMode}`}
      >
        <p>
          {description}
          {documentationUrl ? (
            <>
              {' '}
              <EuiLink
                href={documentationUrl}
                target="_blank"
                external
                data-test-subj={`createDataSourceFlyoutAuthenticationLearnMore-${authenticationMode}`}
              >
                {mainTranslations.docsLink}
              </EuiLink>
            </>
          ) : null}
        </p>
      </EuiText>
    </>
  );
};

export function CreateDataSourceFlyoutAuthenticationSelect({
  dataSourceType,
  authenticationMode,
  onAuthenticationModeChange,
  leadingSpacerSize = 'm',
}: {
  dataSourceType: DataSourceType;
  authenticationMode: CreateDataSourceAuthenticationMode;
  onAuthenticationModeChange: (mode: CreateDataSourceAuthenticationMode) => void;
  /** Gap between the preceding content and the authentication heading. */
  leadingSpacerSize?: EuiSpacerProps['size'];
}) {
  const options = useMemo(
    (): Array<EuiSuperSelectOption<CreateDataSourceAuthenticationMode>> =>
      getCreateDataSourceAuthenticationOptions(dataSourceType).map((option) => {
        return {
          value: option.value,
          inputDisplay: (
            <AuthenticationOptionLabel text={option.text} isRecommended={option.isRecommended} />
          ),
          dropdownDisplay: (
            <>
              <AuthenticationOptionLabel
                text={option.text}
                isRecommended={option.isRecommended}
                isBold
              />
              <EuiText size="s" color="subdued">
                <p>{option.description}</p>
              </EuiText>
            </>
          ),
          'data-test-subj': `createDataSourceFlyoutAuthentication-${option.value}`,
        };
      }),
    [dataSourceType]
  );

  if (!DATA_SOURCE_TYPES_WITH_AUTHENTICATION.has(dataSourceType)) {
    return null;
  }

  return (
    <>
      <EuiSpacer size={leadingSpacerSize} />
      <EuiTitle size="s">
        <h3>{createDataSourceFlyoutAuthenticationTitle()}</h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiFormRow label={createDataSourceFlyoutAuthenticationLabel()} fullWidth>
        <EuiSuperSelect
          options={options}
          valueOfSelected={authenticationMode}
          onChange={onAuthenticationModeChange}
          fullWidth
          data-test-subj="createDataSourceFlyoutAuthentication"
        />
      </EuiFormRow>
      <CreateDataSourceFlyoutAuthenticationMethodDescription
        dataSourceType={dataSourceType}
        authenticationMode={authenticationMode}
      />
    </>
  );
}
