/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { EuiButtonGroupProps } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import type { DataSourceType } from '../../common/datasource_types';
import {
  createDataSourceFlyoutAuthenticationDocumentationLabel,
  createDataSourceFlyoutAuthenticationHelpAriaLabel,
  createDataSourceFlyoutAuthenticationLabel,
  createDataSourceFlyoutAuthenticationTitle,
  DATA_SOURCE_TYPES_WITH_AUTHENTICATION,
  getAnonymousAuthenticationDescription,
  getCreateDataSourceAuthenticationOptions,
  type CreateDataSourceAuthenticationMode,
} from './create_data_source_flyout_authentication';

const DATA_FEDERATION_AUTH_DOCS_URL =
  'https://www.elastic.co/docs/reference/query-languages/esql/esql-data-federation-sources#authentication';

export function CreateDataSourceFlyoutAuthenticationSelect({
  dataSourceType,
  authenticationMode,
  onAuthenticationModeChange,
}: {
  dataSourceType: DataSourceType;
  authenticationMode: CreateDataSourceAuthenticationMode;
  onAuthenticationModeChange: (mode: CreateDataSourceAuthenticationMode) => void;
}) {
  const buttonGroupOptions = useMemo(
    (): EuiButtonGroupProps['options'] =>
      getCreateDataSourceAuthenticationOptions(dataSourceType).map((option) => ({
        id: option.value,
        label: option.text,
        'data-test-subj': `createDataSourceFlyoutAuthentication-${option.value}`,
      })),
    [dataSourceType]
  );

  if (!DATA_SOURCE_TYPES_WITH_AUTHENTICATION.has(dataSourceType)) {
    return null;
  }

  return (
    <>
      <EuiSpacer size="m" />
      <EuiFlexGroup responsive={false} alignItems="center" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
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
      <EuiButtonGroup
        legend={createDataSourceFlyoutAuthenticationLabel()}
        type="single"
        options={buttonGroupOptions}
        idSelected={authenticationMode}
        onChange={(id) => onAuthenticationModeChange(id as CreateDataSourceAuthenticationMode)}
        isFullWidth
        data-test-subj="createDataSourceFlyoutAuthentication"
      />
      {authenticationMode === 'anonymous' ? (
        <>
          <EuiSpacer size="m" />
          <EuiText size="s" color="subdued" data-test-subj="createDataSourceFlyoutAuthenticationAnonymousDescription">
            <p>{getAnonymousAuthenticationDescription(dataSourceType)}</p>
          </EuiText>
        </>
      ) : null}
    </>
  );
};
