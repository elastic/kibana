import React from 'react';

import { KuiEmptyTablePrompt } from '../../../../components';

export function EmptyTablePrompt() {
  return (
    <KuiEmptyTablePrompt
      addHref="#"
      itemType="item"
      promptButtonText="Add a new item"
      promptMessage="Uh oh, You have no items!"
    />
  );
}
