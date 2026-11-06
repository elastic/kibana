/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import { EuiLoadingSpinner, EuiModal, EuiModalBody } from '@elastic/eui';
import type { AttachConversationModalProps } from './attach_conversation_modal';
import * as i18n from './translations';

const AttachConversationModalInner = React.lazy(async () => {
  const { AttachConversationModal } = await import('./attach_conversation_modal');
  return { default: AttachConversationModal };
});

export const AttachConversationModalLazy: React.FC<AttachConversationModalProps> = (props) => (
  <Suspense
    fallback={
      <EuiModal
        onClose={props.onClose}
        aria-label={i18n.MODAL_TITLE}
        data-test-subj="cases-attach-conversation-modal-loading"
      >
        <EuiModalBody>
          <EuiLoadingSpinner size="l" />
        </EuiModalBody>
      </EuiModal>
    }
  >
    <AttachConversationModalInner {...props} />
  </Suspense>
);

AttachConversationModalLazy.displayName = 'AttachConversationModalLazy';
