import React from 'react';

import {
  KuiEmptyTablePromptPanel,
  KuiTableInfo,
} from '../../';

export function KuiListingTableNoMatchesPrompt() {
  return (
    <KuiEmptyTablePromptPanel>
      <KuiTableInfo>
        No items matched your search.
      </KuiTableInfo>
    </KuiEmptyTablePromptPanel>
  );
}
