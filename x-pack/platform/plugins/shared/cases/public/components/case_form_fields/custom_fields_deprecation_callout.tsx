/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ReactNode } from 'react';
import { EuiCallOut, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useCasesContext } from '../cases_context/use_cases_context';
import {
  useCasesFieldLibraryNavigation,
  useConfigureCasesNavigation,
} from '../../common/navigation';
import * as i18n from './translations';
import * as configureCasesI18n from '../configure_cases/translations';

interface CustomFieldsDeprecationCalloutProps {
  title?: ReactNode;
}

/**
 * Warning callout shown above legacy custom fields when templates v2 is enabled.
 * Users with settings permission get links to manage fields and disable the legacy
 * section; users without settings permission get an administrator-contact message.
 */
export const CustomFieldsDeprecationCallout: React.FC<CustomFieldsDeprecationCalloutProps> = ({
  title,
}) => {
  const { permissions } = useCasesContext();
  const { getCasesFieldLibraryUrl } = useCasesFieldLibraryNavigation();
  const { getConfigureCasesUrl } = useConfigureCasesNavigation();

  return (
    <EuiCallOut
      announceOnMount
      title={title}
      color="warning"
      iconType="warning"
      size="s"
      data-test-subj="legacy-custom-fields-deprecation-callout"
    >
      {permissions.settings ? (
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
      ) : (
        <FormattedMessage
          id="xpack.cases.caseFormFields.legacyCustomFieldsDeprecationBodyNoSettings"
          defaultMessage="These custom fields are deprecated and have already been migrated to the new system, so you may see the same fields in both places. Contact your administrator to confirm the fields have been migrated, so that the legacy custom fields can be safely removed."
        />
      )}
    </EuiCallOut>
  );
};
CustomFieldsDeprecationCallout.displayName = 'CustomFieldsDeprecationCallout';
