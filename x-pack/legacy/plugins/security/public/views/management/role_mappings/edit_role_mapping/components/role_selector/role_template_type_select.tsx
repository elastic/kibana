/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiComboBox } from '@elastic/eui';
import { RoleTemplate } from '../../../../../../../common/model';
import { isInlineRoleTemplate, isStoredRoleTemplate } from '../../services/role_template_type';

const templateTypeOptions = [
  {
    id: 'inline',
    label: i18n.translate(
      'xpack.security.management.editRoleMapping.roleTemplate.inlineTypeLabel',
      { defaultMessage: 'Role template' }
    ),
  },
  {
    id: 'stored',
    label: i18n.translate(
      'xpack.security.management.editRoleMapping.roleTemplate.storedTypeLabel',
      { defaultMessage: 'Stored script' }
    ),
  },
];

interface Props {
  roleTemplate: RoleTemplate;
  onChange: (roleTempplate: RoleTemplate) => void;
  canUseStoredScripts: boolean;
  canUseInlineScripts: boolean;
}

export const RoleTemplateTypeSelect = (props: Props) => {
  const availableOptions = templateTypeOptions.filter(
    ({ id }) =>
      (id === 'inline' && props.canUseInlineScripts) ||
      (id === 'stored' && props.canUseStoredScripts)
  );

  const selectedOptions = templateTypeOptions.filter(
    ({ id }) =>
      (id === 'inline' && isInlineRoleTemplate(props.roleTemplate)) ||
      (id === 'stored' && isStoredRoleTemplate(props.roleTemplate))
  );

  return (
    <EuiComboBox
      options={availableOptions}
      singleSelection={{ asPlainText: true }}
      selectedOptions={selectedOptions}
      data-test-subj="roleMappingsFormTemplateType"
      onChange={selected => {
        const [{ id }] = selected;
        if (id === 'inline') {
          props.onChange({
            ...props.roleTemplate,
            template: {
              source: '',
            },
          });
        } else {
          props.onChange({
            ...props.roleTemplate,
            template: {
              id: '',
            },
          });
        }
      }}
      isClearable={false}
    />
  );
};
