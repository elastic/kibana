/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public';
import { OAuthGoogleDriveActionParams } from '.';

const OAuthGoogleDriveFields: React.FunctionComponent<
  ActionParamsProps<OAuthGoogleDriveActionParams>
> = ({ actionParams, editAction, index, messageVariables, executionMode, errors }) => {
  return <></>;
};

// eslint-disable-next-line import/no-default-export
export { OAuthGoogleDriveFields as default };
