/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAccordion, EuiCodeBlock, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ToolResult } from '@kbn/onechat-common/tools/tool_result';
import React from 'react';

interface OtherResultStepProps {
  result: ToolResult;
}

export const OtherResultStep: React.FC<OtherResultStepProps> = ({ result }) => {
  const resultContentId = useGeneratedHtmlId({ prefix: 'result-accordion-content' });
  return (
    <EuiAccordion
      id={resultContentId}
      buttonContent={i18n.translate(
        'xpack.onechat.conversation.round.otherResultStep.accordionButton',
        {
          defaultMessage: 'View content',
        }
      )}
    >
      <EuiCodeBlock
        language="json"
        fontSize="s"
        paddingSize="s"
        isCopyable={false}
        overflowHeight={150}
        transparentBackground
      >
        {JSON.stringify(result.data, null, 2)}
      </EuiCodeBlock>
    </EuiAccordion>
  );
};
