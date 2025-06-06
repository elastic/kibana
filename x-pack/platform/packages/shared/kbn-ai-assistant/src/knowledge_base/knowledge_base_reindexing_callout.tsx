/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const KnowledgeBaseReindexingCallout = () => {
  return (
    <EuiFlexGroup justifyContent="center" gutterSize="s">
      <EuiFlexItem grow>
        <EuiCallOut
          title={i18n.translate('xpack.aiAssistant.knowledgeBase.reindexingCalloutTitle', {
            defaultMessage: 'Re-indexing in progress.',
          })}
          color="warning"
          iconType="alert"
          data-test-subj="knowledgeBaseReindexingCallOut"
        >
          {i18n.translate('xpack.aiAssistant.knowledgeBase.reindexingCalloutBody', {
            defaultMessage:
              'Knowledge base is currently being re-indexed. Some entries will be unavailable until the operation completes.',
          })}
        </EuiCallOut>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
