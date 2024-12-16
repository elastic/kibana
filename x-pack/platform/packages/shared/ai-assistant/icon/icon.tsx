/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon, EuiIconProps } from '@elastic/eui';
import { dynamic } from '@kbn/shared-ux-utility';

/**
 * Props for the AI Assistant icon.
 */
export type AssistantIconProps = Omit<EuiIconProps, 'type'>;

/**
 * Default Elastic AI Assistant icon.
 */
export const AssistantIcon = ({ size = 'm', ...rest }: AssistantIconProps) => {
  // TODO: can be removed once added to EUI.
  const type = dynamic(() => import('./svg/assistant'));
  return <EuiIcon {...{ type, size, ...rest }} />;
};
