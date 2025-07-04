/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { ScopedHistory } from '@kbn/core/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';

import { CreateRoleMappingButton } from '../create_role_mapping_button';

interface EmptyPromptProps {
  history: ScopedHistory;
  readOnly?: boolean;
}

export const EmptyPrompt: React.FunctionComponent<EmptyPromptProps> = ({
  history,
  readOnly = false,
}) => (
  <KibanaPageTemplate.EmptyPrompt
    iconType="managementApp"
    title={
      <h1>
        {readOnly ? (
          <FormattedMessage
            id="xpack.security.management.roleMappings.readOnlyEmptyPromptTitle"
            defaultMessage="There are no role mappings to view"
          />
        ) : (
          <FormattedMessage
            id="xpack.security.management.roleMappings.emptyPromptTitle"
            defaultMessage="Create your first role mapping"
          />
        )}
      </h1>
    }
    body={
      <p>
        <FormattedMessage
          id="xpack.security.management.roleMappings.emptyPromptDescription"
          defaultMessage="Role mappings control which roles are assigned to your users."
        />
      </p>
    }
    actions={readOnly ? null : <CreateRoleMappingButton history={history} />}
    data-test-subj="roleMappingsEmptyPrompt"
  />
);
