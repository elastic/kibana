/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ReactNode } from 'react';
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
import { useKibana } from '@kbn/kibana-react-plugin/public';

import type { DataSourceType } from '../../common/datasource_types';
import type { DataFederationKibanaServices } from '../types';
import {
  AUTHENTICATION_DOC_LINK_KEYS,
  DATA_SOURCE_TYPES_WITH_AUTHENTICATION,
  getCreateDataSourceAuthenticationOptions,
  type CreateDataSourceAuthenticationMode,
} from './create_data_source_flyout_authentication';
import { authenticationStrings } from './create_data_source_flyout_authentication_i18n';

const withRecommendedBadge = (label: ReactNode, recommended?: boolean): ReactNode => {
  if (!recommended) {
    return label;
  }

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>{label}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiBadge color="hollow">{authenticationStrings.recommendedBadge()}</EuiBadge>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export function CreateDataSourceFlyoutAuthenticationSelect({
  dataSourceType,
  authenticationMode,
  enableFederatedIdentity,
  onAuthenticationModeChange,
}: {
  dataSourceType: DataSourceType;
  authenticationMode: CreateDataSourceAuthenticationMode;
  enableFederatedIdentity?: boolean;
  onAuthenticationModeChange: (mode: CreateDataSourceAuthenticationMode) => void;
}) {
  const {
    services: { docLinks },
  } = useKibana<DataFederationKibanaServices>();

  if (!DATA_SOURCE_TYPES_WITH_AUTHENTICATION.has(dataSourceType)) {
    return null;
  }

  const options = getCreateDataSourceAuthenticationOptions(dataSourceType, {
    enableFederatedIdentity,
  });
  const selectedDescription = options.find((o) => o.value === authenticationMode)?.description;
  const docsUrl = docLinks.links.dataFederation[AUTHENTICATION_DOC_LINK_KEYS[authenticationMode]];

  return (
    <>
      <EuiSpacer size="m" />
      <EuiTitle size="xs">
        <h3>{authenticationStrings.title()}</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFormRow
        label={authenticationStrings.preferredMethodLabel()}
        fullWidth
        helpText={
          selectedDescription && (
            <>
              {selectedDescription}{' '}
              <EuiLink
                href={docsUrl}
                target="_blank"
                external
                data-test-subj={`createDataSourceFlyoutAuthenticationLearnMore-${authenticationMode}`}
              >
                {authenticationStrings.learnMore()}
              </EuiLink>
            </>
          )
        }
      >
        <EuiSuperSelect
          data-test-subj="createDataSourceFlyoutAuthentication"
          fullWidth
          valueOfSelected={authenticationMode}
          onChange={onAuthenticationModeChange}
          options={options.map(({ value, text, description, recommended }) => ({
            value,
            inputDisplay: withRecommendedBadge(text, recommended),
            dropdownDisplay: (
              <>
                {withRecommendedBadge(<strong>{text}</strong>, recommended)}
                <EuiText size="s" color="subdued">
                  {description}
                </EuiText>
              </>
            ),
          }))}
        />
      </EuiFormRow>
    </>
  );
}
