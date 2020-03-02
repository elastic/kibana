/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Selection } from './';
import { EuiText } from '@elastic/eui';

interface SelectionTextProps {
  selection: Selection;
  resetSelection: () => void;
}

export function SelectionText({
  selection,
  resetSelection
}: SelectionTextProps) {
  return (
    // <div
    //   style={{
    //     visibility: selection[0] ? 'visible' : 'hidden',
    //     // fontSize: '11px',
    //     // color: 'grey',
    //     textAlign: 'right',
    //     marginBottom: 16
    //   }}
    // >
    <EuiText color="subdued">
      Selected {selection[0] && (selection[0] / 100).toFixed(0)}
      &thinsp;&ndash;&thinsp;
      {selection[1] && (selection[1] / 100).toFixed(0)} ms |{' '}
      <button onClick={resetSelection} style={{ color: 'blue' }}>
        Reset
      </button>
    </EuiText>
    //    </div>
  );
}
