/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect } from 'react';
import { EuiCallOut, EuiFlexGroup, EuiHorizontalRule, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useFormContext } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { Title } from './title';
import { Tags } from './tags';
import { Category } from './category';
import { Severity } from './severity';
import { Description } from './description';
import { useCasesFeatures } from '../../common/use_cases_features';
import { Assignees } from './assignees';
import { CustomFields } from './custom_fields';
import type { CasesConfigurationUI } from '../../containers/types';
import { KibanaServices } from '../../common/lib/kibana';
import { CreateCaseTemplateFields } from '../create/template_fields';
import { useShowLegacyCustomFields } from '../../common/use_show_old_custom_fields';
import {
  useCasesFieldLibraryNavigation,
  useConfigureCasesNavigation,
} from '../../common/navigation';
import * as i18n from './translations';
import * as configureCasesI18n from '../configure_cases/translations';

interface Props {
  isLoading: boolean;
  configurationCustomFields: CasesConfigurationUI['customFields'];
  setCustomFieldsOptional?: boolean;
  isEditMode?: boolean;
  draftStorageKey?: string;
}

const CaseFormFieldsComponent: React.FC<Props> = ({
  isLoading,
  configurationCustomFields,
  setCustomFieldsOptional = false,
  isEditMode,
  draftStorageKey,
}) => {
  const { caseAssignmentAuthorized } = useCasesFeatures();
  const isTemplatesV2Enabled = KibanaServices.getConfig()?.templates?.enabled ?? false;
  const { showLegacyCustomFields } = useShowLegacyCustomFields(configurationCustomFields);
  const { getCasesFieldLibraryUrl } = useCasesFieldLibraryNavigation();
  const { getConfigureCasesUrl } = useConfigureCasesNavigation();
  const { setFieldValue } = useFormContext();

  // When templates v2 is off, always show legacy custom fields (they are the only system).
  // When templates v2 is on, gate visibility behind the settings local-storage switch
  // (forced on when required fields lack defaults).
  const showLegacyCustomFieldsInputs =
    configurationCustomFields.length > 0 && (!isTemplatesV2Enabled || showLegacyCustomFields);

  // Drop stale create-form values when the legacy section is gated off so they cannot linger
  // in form state. Edit mode keeps case custom fields intact.
  useEffect(() => {
    if (!isEditMode && !showLegacyCustomFieldsInputs) {
      setFieldValue('customFields', {});
    }
  }, [isEditMode, showLegacyCustomFieldsInputs, setFieldValue]);

  const deprecationNotice = isTemplatesV2Enabled ? (
    <EuiCallOut
      announceOnMount
      color="warning"
      iconType="warning"
      size="s"
      data-test-subj="legacy-custom-fields-deprecation-callout"
    >
      <FormattedMessage
        id="xpack.cases.caseFormFields.legacyCustomFieldsDeprecationBody"
        defaultMessage='These custom fields are deprecated and have already been migrated to the new system, so you may see the same fields in both places. Manage them in {customFieldsLink}. To stop showing them here, disable "{switchLabel}" in {settingsLink}.'
        values={{
          customFieldsLink: (
            <EuiLink
              href={getCasesFieldLibraryUrl()}
              data-test-subj="legacy-custom-fields-view-new-link"
            >
              {i18n.LEGACY_CUSTOM_FIELDS_VIEW_CUSTOM_FIELDS}
            </EuiLink>
          ),
          switchLabel: configureCasesI18n.SHOW_LEGACY_CUSTOM_FIELDS_AND_TEMPLATES,
          settingsLink: (
            <EuiLink
              href={getConfigureCasesUrl()}
              data-test-subj="legacy-custom-fields-view-settings-link"
            >
              {i18n.LEGACY_CUSTOM_FIELDS_VIEW_SETTINGS}
            </EuiLink>
          ),
        }}
      />
    </EuiCallOut>
  ) : undefined;

  return (
    <EuiFlexGroup data-test-subj="case-form-fields" direction="column" gutterSize="none">
      <Title isLoading={isLoading} />
      {caseAssignmentAuthorized ? <Assignees isLoading={isLoading} /> : null}
      <Tags isLoading={isLoading} />
      <Category isLoading={isLoading} />
      <Severity isLoading={isLoading} />
      <Description isLoading={isLoading} draftStorageKey={draftStorageKey} />
      {showLegacyCustomFieldsInputs ? (
        <>
          <CustomFields
            isLoading={isLoading}
            setCustomFieldsOptional={setCustomFieldsOptional}
            configurationCustomFields={configurationCustomFields}
            isEditMode={isEditMode}
            showDeprecatedBadge={isTemplatesV2Enabled}
            notice={deprecationNotice}
          />
          <EuiHorizontalRule margin="l" data-test-subj="legacy-custom-fields-divider" />
        </>
      ) : null}
      {isTemplatesV2Enabled && (
        <CreateCaseTemplateFields addTopSpacing={!showLegacyCustomFieldsInputs} />
      )}
    </EuiFlexGroup>
  );
};

CaseFormFieldsComponent.displayName = 'CaseFormFields';

export const CaseFormFields = memo(CaseFormFieldsComponent);
