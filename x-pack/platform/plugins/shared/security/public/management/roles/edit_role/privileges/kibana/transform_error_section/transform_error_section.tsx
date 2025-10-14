/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt } from '@elastic/eui';
import React, { PureComponent } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { RoleTransformErrorReason } from '@kbn/security-plugin-types-common';

interface TransformErrorSectionProps {
  transformErrors: string[];
}

const transformErrorMessages: Record<string, string> = {
  [RoleTransformErrorReason.RESERVED_PRIVILEGES_MIXED]: i18n.translate(
    'xpack.security.management.editRole.transformError.reservedPrivilegesMixed',
    {
      defaultMessage: 'Role contains reserved privileges mixed with non-reserved privileges.',
    }
  ),
  [RoleTransformErrorReason.RESERVED_PRIVILEGES_WRONG_APP]: i18n.translate(
    'xpack.security.management.editRole.transformError.reservedPrivilegesWrongApp',
    {
      defaultMessage: 'Role has reserved privileges assigned to non-reserved applications.',
    }
  ),
  [RoleTransformErrorReason.SPACE_PRIVILEGES_GLOBAL]: i18n.translate(
    'xpack.security.management.editRole.transformError.spacePrivilegesGlobal',
    {
      defaultMessage: 'Role has space privileges assigned globally.',
    }
  ),
  [RoleTransformErrorReason.GLOBAL_PRIVILEGES_SPACE]: i18n.translate(
    'xpack.security.management.editRole.transformError.globalPrivilegesSpace',
    {
      defaultMessage: 'Role has global or reserved privileges assigned to specific spaces.',
    }
  ),
  [RoleTransformErrorReason.BASE_FEATURE_PRIVILEGES_MIXED]: i18n.translate(
    'xpack.security.management.editRole.transformError.baseFeaturePrivilegesMixed',
    {
      defaultMessage: 'Role has base privileges mixed with feature privileges.',
    }
  ),
  [RoleTransformErrorReason.GLOBAL_RESOURCE_MIXED]: i18n.translate(
    'xpack.security.management.editRole.transformError.globalResourceMixed',
    {
      defaultMessage: 'Role has global resource mixed with other resources.',
    }
  ),
  [RoleTransformErrorReason.INVALID_RESOURCE_FORMAT]: i18n.translate(
    'xpack.security.management.editRole.transformError.invalidResourceFormat',
    {
      defaultMessage: 'Role has improperly formatted resource entries.',
    }
  ),
  [RoleTransformErrorReason.DUPLICATED_RESOURCES]: i18n.translate(
    'xpack.security.management.editRole.transformError.duplicatedResources',
    {
      defaultMessage: 'Role has duplicated resources in entries.',
    }
  ),
  [RoleTransformErrorReason.FEATURE_REQUIRES_ALL_SPACES]: i18n.translate(
    'xpack.security.management.editRole.transformError.featureRequiresAllSpaces',
    {
      defaultMessage:
        'Role has feature privileges that require all spaces but are assigned to specific spaces.',
    }
  ),
  [RoleTransformErrorReason.DISABLED_FEATURE_PRIVILEGES]: i18n.translate(
    'xpack.security.management.editRole.transformError.disabledFeaturePrivileges',
    {
      defaultMessage: 'Role uses disabled feature privileges.',
    }
  ),
};

const ERROR_PREFIX = 'kibana:';
export class TransformErrorSection extends PureComponent<TransformErrorSectionProps, {}> {
  private getErrorMessage() {
    const { transformErrors } = this.props;

    const errorReason = transformErrors
      .find((error) => error.startsWith(ERROR_PREFIX))
      ?.replace(ERROR_PREFIX, '');

    return errorReason && transformErrorMessages[errorReason]
      ? transformErrorMessages[errorReason]
      : i18n.translate('xpack.security.management.editRole.transformErrorSectionDescription', {
          defaultMessage:
            'This role definition is invalid, and cannot be edited through this screen.',
        });
  }

  public render() {
    return (
      <EuiEmptyPrompt
        color="danger"
        iconType="warning"
        title={
          <h2>
            <FormattedMessage
              id="xpack.security.management.editRole.transformErrorSectionTitle"
              defaultMessage="Malformed role"
            />
          </h2>
        }
        body={<p>{this.getErrorMessage()}</p>}
      />
    );
  }
}
