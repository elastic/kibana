/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { ReactNode } from 'react';
import { sortBy } from 'lodash';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, EuiFormRow } from '@elastic/eui';

import type { CasesConfigurationUI } from '../../../common/ui';
import { builderMap as customFieldsBuilderMap } from '../custom_fields/builder';
import * as i18n from './translations';

interface Props {
  isLoading: boolean;
  configurationCustomFields: CasesConfigurationUI['customFields'];
  setCustomFieldsOptional?: boolean;
  isEditMode?: boolean;
  /** Renders a Deprecated badge and "Legacy custom fields" heading. */
  showDeprecatedBadge?: boolean;
  /** Rendered below the section heading (e.g. deprecation callout). */
  notice?: ReactNode;
}

const CustomFieldsComponent: React.FC<Props> = ({
  isLoading,
  setCustomFieldsOptional = false,
  configurationCustomFields,
  isEditMode,
  showDeprecatedBadge = false,
  notice,
}) => {
  const sortedCustomFields = useMemo(
    () => sortCustomFieldsByLabel(configurationCustomFields),
    [configurationCustomFields]
  );

  const customFieldsComponents = sortedCustomFields.map(
    (customField: CasesConfigurationUI['customFields'][number]) => {
      const customFieldFactory = customFieldsBuilderMap[customField.type];
      const customFieldType = customFieldFactory().build();

      const CreateComponent = customFieldType.Create;

      return (
        <CreateComponent
          isLoading={isLoading}
          customFieldConfiguration={customField}
          key={customField.key}
          setAsOptional={setCustomFieldsOptional}
          setDefaultValue={!isEditMode}
        />
      );
    }
  );

  if (!configurationCustomFields.length) {
    return null;
  }

  const sectionTitle = showDeprecatedBadge
    ? i18n.LEGACY_CUSTOM_FIELDS_SECTION_TITLE
    : i18n.CUSTOM_FIELDS;

  return (
    <EuiFormRow fullWidth>
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText size="m">
              <h3>{sectionTitle}</h3>
            </EuiText>
          </EuiFlexItem>
          {showDeprecatedBadge ? (
            <EuiFlexItem grow={false}>
              <EuiBadge color="warning" data-test-subj="legacy-custom-fields-deprecated-badge">
                {i18n.DEPRECATED_BADGE}
              </EuiBadge>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
        {notice ? (
          <>
            <EuiSpacer size="s" />
            {notice}
          </>
        ) : null}
        <EuiSpacer size="xs" />
        <EuiFlexItem data-test-subj="caseCustomFields">{customFieldsComponents}</EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
};

CustomFieldsComponent.displayName = 'CustomFields';

export const CustomFields = React.memo(CustomFieldsComponent);

const sortCustomFieldsByLabel = (configCustomFields: CasesConfigurationUI['customFields']) => {
  return sortBy(configCustomFields, (configCustomField) => {
    return configCustomField.label;
  });
};
