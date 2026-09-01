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
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiSuperSelect,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import type { DataSourceType } from '../../common/datasource_types';
import {
  createDataSourceFlyoutAuthenticationDocumentationLabel,
  createDataSourceFlyoutAuthenticationHelpAriaLabel,
  createDataSourceFlyoutAuthenticationLabel,
  createDataSourceFlyoutAuthenticationRecommendedBadge,
  createDataSourceFlyoutAuthenticationTitle,
  DATA_SOURCE_TYPES_WITH_AUTHENTICATION,
  getAnonymousAuthenticationDescription,
  getCreateDataSourceAuthenticationOptions,
  type CreateDataSourceAuthenticationMode,
} from './create_data_source_flyout_authentication';

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

const DATA_FEDERATION_AUTH_DOCS_URL =
  'https://www.elastic.co/docs/reference/query-languages/esql/esql-data-federation-sources#authentication';

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
      <EuiFlexGroup responsive={false} alignItems="center" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiTitle size="s">
            <h3>{createDataSourceFlyoutAuthenticationTitle()}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            iconType="documentation"
            iconSide="left"
            href={DATA_FEDERATION_AUTH_DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={createDataSourceFlyoutAuthenticationHelpAriaLabel()}
            data-test-subj="createDataSourceFlyoutAuthenticationHelpLink"
          >
            {createDataSourceFlyoutAuthenticationDocumentationLabel()}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
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
      {authenticationMode === 'anonymous' ? (
        <>
          <EuiSpacer size="m" />
          <EuiText
            size="s"
            color="subdued"
            data-test-subj="createDataSourceFlyoutAuthenticationAnonymousDescription"
          >
            <p>{getAnonymousAuthenticationDescription(dataSourceType)}</p>
          </EuiText>
        </>
      ) : null}
    </>
  );
}
