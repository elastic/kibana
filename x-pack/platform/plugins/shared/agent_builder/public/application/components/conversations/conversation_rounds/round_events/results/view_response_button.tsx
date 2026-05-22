/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, Fragment } from 'react';
import { EuiButton, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ToolResult } from '@kbn/agent-builder-common/tools/tool_result';
import { ToolResponseFlyout } from '../flyouts/tool_response_flyout';
import { ToolResult as ToolResultDispatcher } from './tool_result';

const buttonLabel = i18n.translate('xpack.agentBuilder.roundEvents.results.viewResponse', {
  defaultMessage: 'View JSON',
});

interface ViewResponseButtonProps {
  results: ToolResult[];
}

/**
 * Button that opens `ToolResponseFlyout` containing the given results.
 *
 * Only rendered inside a tool call's expanded sub-fields when the tool's
 * `results[]` contains at least one entry that isn't renderable inline
 * (anything other than `query` / `esqlResults` / `error`).
 */
export const ViewResponseButton: React.FC<ViewResponseButtonProps> = ({ results }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <EuiButton iconType="editorCodeBlock" size="s" color="text" onClick={() => setIsOpen(true)}>
        {buttonLabel}
      </EuiButton>
      <ToolResponseFlyout isOpen={isOpen} onClose={() => setIsOpen(false)}>
        {results.map((result, index) => (
          <Fragment key={`flyout-result-${index}`}>
            <ToolResultDispatcher result={result} mode="flyout" />
            {index < results.length - 1 && <EuiSpacer size="m" />}
          </Fragment>
        ))}
      </ToolResponseFlyout>
    </>
  );
};
