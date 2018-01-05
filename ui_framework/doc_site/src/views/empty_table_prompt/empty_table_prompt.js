import React from 'react';

import { KuiEmptyTablePrompt, KuiLinkButton, KuiButtonIcon } from '../../../../components';

export function EmptyTablePrompt() {
  return (
    <KuiEmptyTablePrompt
      actions={
        <KuiLinkButton
          icon={<KuiButtonIcon type="create"/>}
          aria-label="Add a new item"
          data-test-subj="addNewPromptButton"
          buttonType="primary"
          href="#"
        >
            Add a new item
        </KuiLinkButton>
      }
      message="Uh oh, You have no items!"
    />
  );
}
