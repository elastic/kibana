/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiCodeBlock, EuiFlexGroup, EuiFlexItem, useResizeObserver } from '@elastic/eui';
import { css } from '@emotion/react';
import type { SerializedPolicy } from '@kbn/index-lifecycle-management-common-shared';
import { inspectIlmPolicyFlyoutStrings as strings } from './strings';

export interface IlmPolicyJsonTabProps {
  policyName: string;
  policy: SerializedPolicy;
}

const codeBlockItemStyles = css`
  min-height: 0;
`;

export const IlmPolicyJsonTab = ({ policyName, policy }: IlmPolicyJsonTabProps) => {
  const [containerElement, setContainerElement] = useState<HTMLDivElement | null>(null);
  const { height: containerHeight } = useResizeObserver(containerElement);

  const { name: _name, ...policyBody } = policy;
  const fullRequest = `PUT _ilm/policy/${policyName}\n${JSON.stringify(
    { policy: policyBody },
    null,
    2
  )}`;

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="none"
      responsive={false}
      ref={setContainerElement}
      className="eui-fullHeight"
      data-test-subj="ilmPolicyJsonTab"
    >
      <EuiFlexItem grow css={codeBlockItemStyles}>
        <EuiCodeBlock
          language="json"
          isCopyable
          transparentBackground
          paddingSize="l"
          fontSize="s"
          whiteSpace="pre"
          overflowHeight={containerHeight > 0 ? containerHeight : undefined}
          copyAriaLabel={strings.copyRequestAriaLabel}
          data-test-subj="ilmPolicyJsonTabCodeBlock"
        >
          {fullRequest}
        </EuiCodeBlock>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
