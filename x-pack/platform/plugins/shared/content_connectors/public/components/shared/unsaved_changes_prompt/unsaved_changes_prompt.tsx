/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { Prompt } from 'react-router-dom';

import { i18n } from '@kbn/i18n';

const DEFAULT_MESSAGE_TEXT = i18n.translate(
  'xpack.contentConnectors.shared.unsavedChangesMessage',
  {
    defaultMessage: 'Your changes have not been saved. Are you sure you want to leave?',
  }
);
interface Props {
  hasUnsavedChanges: boolean;
  messageText?: string;
}

export const UnsavedChangesPrompt: React.FC<Props> = ({
  hasUnsavedChanges,
  messageText = DEFAULT_MESSAGE_TEXT,
}) => {
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        // These 2 lines of code are the recommendation from MDN for triggering a browser prompt for confirming
        // whether or not a user wants to leave the current site.
        event.preventDefault();
        event.returnValue = '';
      }
    };
    // Adding this handler will prompt users if they are navigating to a new page, outside of the Kibana SPA
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsavedChanges]);

  // Adding this Prompt will prompt users if they are navigating to a new page, within the Kibana SPA
  return <Prompt when={hasUnsavedChanges} message={messageText} />;
};
