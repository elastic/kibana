/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect, useMemo } from 'react';
import { EuiFlexGroup, EuiHorizontalRule } from '@elastic/eui';
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
import { CustomFieldsDeprecationCallout } from './custom_fields_deprecation_callout';

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

  const deprecationNotice = isTemplatesV2Enabled ? <CustomFieldsDeprecationCallout /> : undefined;

  // Keys of the legacy custom fields actually rendered above — a global definition linked to
  // one of these must not also render in CreateCaseTemplateFields (see its prop doc).
  const visibleLegacyCustomFieldKeys = useMemo(
    () =>
      showLegacyCustomFieldsInputs
        ? new Set(configurationCustomFields.map((cf) => cf.key))
        : new Set<string>(),
    [showLegacyCustomFieldsInputs, configurationCustomFields]
  );

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
        <CreateCaseTemplateFields
          addTopSpacing={!showLegacyCustomFieldsInputs}
          visibleLegacyCustomFieldKeys={visibleLegacyCustomFieldKeys}
        />
      )}
    </EuiFlexGroup>
  );
};

CaseFormFieldsComponent.displayName = 'CaseFormFields';

export const CaseFormFields = memo(CaseFormFieldsComponent);
