/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText, EuiSpacer } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { isMac } from '@kbn/shared-ux-utility';
import { AI_ASSISTANT_SETTINGS_MENU_CONTAINER_ID } from '../../assistant/assistant_header';

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
        defaultMessage="AI Assistant can now cite sources in its responses. Toggle citations by using this menu or <bold>{keyboardShortcut}</bold>"
        values={{
          keyboardShortcut: isMac ? '⌥ + c' : 'Alt + c',
          bold: (str) => <strong>{str}</strong>,
        }}
      />
      <EuiSpacer size="s" />
      <FormattedMessage
        id="xpack.elasticAssistant.anonymizedValuesAndCitations.tour.content.anonymizedValues"
        defaultMessage="Quickly toggle the obfuscation of anonymized values in your conversation by using this menu, or <bold>{keyboardShortcut}</bold>. This does not affect the anonymization of data sent to the LLM"
        values={{
          keyboardShortcut: isMac ? '⌥ + a' : 'Alt + a',
          bold: (str) => <strong>{str}</strong>,
        }}
      />
    </EuiText>
  ),
};
