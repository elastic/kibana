import React from 'react';

import { KuiPromptForItems } from '../../../../components';

export function PromptForItems() {
  return (
    <KuiPromptForItems
      addHref="#"
      itemType="item"
      promptButtonText="Add a new item"
      promptMessage="Uh oh, You have no items!"
    />
  );
}
