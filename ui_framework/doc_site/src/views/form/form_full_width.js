import React from 'react';

import {
  KuiFieldSearch,
  KuiRange,
  KuiTextArea,
  KuiFormRow,
  KuiFlexGroup,
  KuiFlexItem,
  KuiSpacer,
  KuiButton,
} from '../../../../components';

// Don't use this, make proper ids instead. This is just for the example.
function makeId() {
  return Math.random().toString(36).substr(2, 5);
}

export default () => (
  <div>
    <KuiFlexGroup>
      <KuiFlexItem>
        <KuiFieldSearch placeholder="Search..." fullWidth />
      </KuiFlexItem>
      <KuiFlexItem grow={false}>
        <KuiButton>Search</KuiButton>
      </KuiFlexItem>
    </KuiFlexGroup>

    <KuiSpacer size="l" />

    <KuiFormRow
      id={makeId()}
      label="Works on form rows too"
      fullWidth
      helpText="Note that fullWidth prop is passed to both the row and the child in this example"
    >
      <KuiRange
        min={0}
        max={100}
        name="range"
        fullWidth
      />
    </KuiFormRow>
    <KuiFormRow
      id={makeId()}
      label="Often useful for text areas"
      fullWidth
      helpText="Again, passed to both the row and the textarea."
    >
      <KuiTextArea
        fullWidth
        placeholder="There is a reason we do not make forms ALWAYS 100% width.
          See how this text area becomes extremely hard to read when the individual
          lines get this long? It is much more readable when contained to a scannable max-width."
      />
    </KuiFormRow>


    <br />
    <br />

  </div>
);
