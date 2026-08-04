/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public';
import { TextAreaWithMessageVariables } from '@kbn/triggers-actions-ui-plugin/public';
import type { TeamsActionParams } from '../types';

const TeamsParamsFields: React.FunctionComponent<ActionParamsProps<TeamsActionParams>> = ({
  actionParams,
  editAction,
  index,
  errors,
  messageVariables,
}) => {
  const { message } = actionParams;

  return (
    <TextAreaWithMessageVariables
      index={index}
      editAction={editAction}
      messageVariables={messageVariables}
      paramsProperty={'message'}
      inputTargetValue={message}
      label={i18n.translate('xpack.stackConnectors.components.teams.messageTextAreaFieldLabel', {
        defaultMessage: 'Message',
      })}
      errors={(errors.message ?? []) as string[]}
    />
  );
};

// eslint-disable-next-line import/no-default-export
export { TeamsParamsFields as default };
