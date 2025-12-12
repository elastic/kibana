/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AssistantCallToAction, type AssistantCallToActionProps } from '../call_to_action';

import { translations } from './ready_to_help.translations';

/**
 * Props for the `ReadyToHelp`.
 */
export interface ReadyToHelpProps
  extends Pick<AssistantCallToActionProps, 'data-test-subj' | 'centered'> {
  /** The type of serverless project or project focus for the deployment. */
  type?: 'stack' | 'security' | 'oblt' | 'search';
}

/**
 * A pure component that renders a call to action that indicates the AI Assistant is configured
 * and ready to be used.
 */
export const ReadyToHelp = ({ type = 'stack', ...props }: ReadyToHelpProps) => {
  const { title } = translations;

  let description = translations.description;

  switch (type) {
    case 'security':
      description = translations.securityDescription;
      break;
    case 'oblt':
      description = translations.observabilityDescription;
      break;
    case 'search':
      description = translations.searchDescription;
      break;
  }

  return <AssistantCallToAction {...{ title, description, ...props }} />;
};
