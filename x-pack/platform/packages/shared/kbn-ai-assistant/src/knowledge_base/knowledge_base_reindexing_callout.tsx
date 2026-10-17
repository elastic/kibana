/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/css';
import { useEuiTheme } from '@elastic/eui';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { i18n } from '@kbn/i18n';

export const KnowledgeBaseReindexingCallout = () => {
  const { euiTheme } = useEuiTheme();

  const knowledgeBaseReindexingCalloutName = css`
    margin-bottom: ${euiTheme.size.s};
    width: 100%;
  `;

  return (
    <KbnWarningCallout
      className={knowledgeBaseReindexingCalloutName}
      title={i18n.translate('xpack.aiAssistant.knowledgeBase.reindexingCalloutTitle', {
        defaultMessage: 'Re-indexing in progress.',
      })}
      data-test-subj="knowledgeBaseReindexingCallOut"
      text={i18n.translate('xpack.aiAssistant.knowledgeBase.reindexingCalloutBody', {
        defaultMessage:
          'Knowledge base is currently being re-indexed. If you have entries, some may be unavailable until the operation completes.',
      })}
    />
  );
};
