/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiText, EuiSpacer, EuiCodeBlock } from '@elastic/eui';
import { Clipboard } from '../../clipboard';

interface Props {
  onCopy: () => void;
}

export const ExternalEmbedPanel = ({ onCopy }: Props) => (
  <div className="canvasWorkpadExport__panelContent">
    <EuiText size="s">
      <p>TODO.</p>
    </EuiText>
    <EuiSpacer />
    <Clipboard content={''} onCopy={onCopy}>
      <EuiCodeBlock
        className="canvasWorkpadExport__reportingConfig"
        paddingSize="s"
        fontSize="s"
        language="yml"
      >
        {'Code goes here'}
      </EuiCodeBlock>
    </Clipboard>
  </div>
);
