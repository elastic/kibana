/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiFieldText,
  EuiSwitch,
  EuiCallOut,
  EuiText,
  EuiButtonEmpty,
} from '@elastic/eui';
import { RoleTemplate } from '../../../../../../../common/model';
import {
  isInlineRoleTemplate,
  isStoredRoleTemplate,
  isInvalidRoleTemplate,
} from '../../services/role_template_type';
import { RoleTemplateTypeSelect } from './role_template_type_select';

interface Props {
  roleTemplate: RoleTemplate;
  canUseInlineScripts: boolean;
  canUseStoredScripts: boolean;
  onChange: (roleTemplate: RoleTemplate) => void;
  onDelete: (roleTemplate: RoleTemplate) => void;
}

export const RoleTemplateEditor = ({
  roleTemplate,
  onChange,
  onDelete,
  canUseInlineScripts,
  canUseStoredScripts,
}: Props) => {
  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      {getTemplateConfigurationFields()}
      {getEditorForTemplate()}
      <EuiFlexItem grow={false}>
        <EuiFormRow>
          <EuiButtonEmpty color="danger" onClick={() => onDelete(roleTemplate)} size="s">
            Delete role template
          </EuiButtonEmpty>
        </EuiFormRow>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  function getTemplateFormatSwitch() {
    return (
      <EuiFormRow label="Returns JSON">
        <EuiSwitch
          checked={roleTemplate.format === 'json'}
          label="returns JSON"
          showLabel={false}
          onChange={e => {
            onChange({
              ...roleTemplate,
              format: e.target.checked ? 'json' : 'string',
            });
          }}
        />
      </EuiFormRow>
    );
  }

  function getTemplateConfigurationFields() {
    const templateTypeComboBox = (
      <EuiFlexItem>
        <EuiFormRow label="Template type">
          <RoleTemplateTypeSelect
            roleTemplate={roleTemplate}
            canUseStoredScripts={canUseStoredScripts}
            canUseInlineScripts={canUseInlineScripts}
            onChange={onChange}
          />
        </EuiFormRow>
      </EuiFlexItem>
    );

    const templateFormatSwitch = <EuiFlexItem>{getTemplateFormatSwitch()}</EuiFlexItem>;

    return (
      <EuiFlexItem>
        <EuiFlexGroup justifyContent="spaceBetween">
          {templateTypeComboBox}
          {templateFormatSwitch}
        </EuiFlexGroup>
      </EuiFlexItem>
    );
  }

  function getEditorForTemplate() {
    if (isInlineRoleTemplate(roleTemplate)) {
      const extraProps: Record<string, any> = {};
      if (!canUseInlineScripts) {
        extraProps.isInvalid = true;
        extraProps.error = (
          <EuiText size="xs" color="danger">
            This template cannot be used because inline scripts are disabled in Elasticsearch.
          </EuiText>
        );
      }
      return (
        <Fragment>
          <EuiFlexItem grow={1} style={{ maxWidth: '400px' }}>
            <EuiFormRow
              label="Template"
              helpText="You can use mustache templates here."
              {...extraProps}
            >
              <EuiFieldText
                value={roleTemplate.template.source}
                onChange={e => {
                  onChange({
                    ...roleTemplate,
                    template: {
                      source: e.target.value,
                    },
                  });
                }}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </Fragment>
      );
    }

    if (isStoredRoleTemplate(roleTemplate)) {
      const extraProps: Record<string, any> = {};
      if (!canUseInlineScripts) {
        extraProps.isInvalid = true;
        extraProps.error = (
          <EuiText size="xs" color="danger">
            This template cannot be used because stored scripts are disabled in Elasticsearch.
          </EuiText>
        );
      }
      return (
        <Fragment>
          <EuiFlexItem grow={1} style={{ maxWidth: '400px' }}>
            <EuiFormRow
              label="Stored script id"
              helpText="Enter the id of a previously stored painless or mustache script."
              {...extraProps}
            >
              <EuiFieldText
                value={roleTemplate.template.id}
                onChange={e => {
                  onChange({
                    ...roleTemplate,
                    template: {
                      id: e.target.value,
                    },
                  });
                }}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </Fragment>
      );
    }

    if (isInvalidRoleTemplate(roleTemplate)) {
      return (
        <EuiFlexItem grow={1}>
          <EuiCallOut color="warning" title="Invalid role template">
            Role template is invalid, and cannot be edited here. Please delete and recreate, or fix
            via the Role Mapping API
          </EuiCallOut>
        </EuiFlexItem>
      );
    }

    throw new Error(`Unable to determine role template type`);
  }
};
