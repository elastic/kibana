/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText, EuiSpacer } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { AI_ASSISTANT_SETTINGS_MENU_CONTAINER_ID } from '../../assistant/assistant_header';

const isMac = navigator.platform.toLowerCase().indexOf('mac') >= 0;

export const anonymizedValuesAndCitationsTourStep1 = {
  title: (
    <FormattedMessage
      id="xpack.elasticAssistant.anonymizedValuesAndCitations.tour.title"
      defaultMessage="Citations & Anonymized values"
    />
  ),
  subTitle: (
    <FormattedMessage
      id="xpack.elasticAssistant.anonymizedValuesAndCitations.tour.subtitle"
      defaultMessage="New and improved!"
    />
  ),
  anchor: `#${AI_ASSISTANT_SETTINGS_MENU_CONTAINER_ID}`,
  content: (
    <EuiText size="s">
      <FormattedMessage
        id="xpack.elasticAssistant.anonymizedValuesAndCitations.tour.content.citedKnowledgeBaseEntries"
        defaultMessage="<bold>Cited</bold> Knowledge base entries show in the chat stream. Toggle on or off in the menu or with the shortcut: {keyboardShortcut}."
        values={{
          keyboardShortcut: isMac ? '⌥ c' : 'Alt c',
          bold: (str) => <strong>{str}</strong>,
        }}
      />
      <EuiSpacer size="s" />
      <FormattedMessage
        id="xpack.elasticAssistant.anonymizedValuesAndCitations.tour.content.anonymizedValues"
        defaultMessage="The toggle to show or hide <bold>Anonymized values</bold> in the chat stream, has moved to the menu. Use the shortcut: {keyboardShortcut}. Your data is still sent anonymized to the LLM based on the settings in the Anonymization panel."
        values={{
          keyboardShortcut: isMac ? '⌥ a' : 'Alt a',
          bold: (str) => <strong>{str}</strong>,
        }}
      />
    </EuiText>
  ),
};
