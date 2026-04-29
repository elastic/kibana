/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiMarkdownAstNode, EuiMarkdownParseError } from '@elastic/eui';
import { EuiMarkdownEditor } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useCallback } from 'react';
import { MAX_ARTIFACTS_INVESTIGATION_GUIDE_LENGTH } from '@kbn/alerting-types/rule/latest';

interface Props {
  setRuleParams: (v: { investigation_guide: { blob: string } }) => void;
  value: string;
}

export function InvestigationGuideEditor({ setRuleParams, value }: Props) {
  const [errorMessages, setErrorMessages] = React.useState<string[]>([]);
  const onParse = useCallback(
    (_: EuiMarkdownParseError | null, { ast }: { ast: EuiMarkdownAstNode }) => {
      const length = ast.position?.end.offset ?? 0;
      // Update the error message with the current length
      if (length > MAX_ARTIFACTS_INVESTIGATION_GUIDE_LENGTH) {
        setErrorMessages([
          i18n.translate('responseOpsRuleForm.investigationGuide.editor.errorMessage', {
            defaultMessage:
              'The investigation guide is too long. Please shorten it.\nCurrent length: {length}.\nMax length: {maxLength}.',
            values: { length, maxLength: MAX_ARTIFACTS_INVESTIGATION_GUIDE_LENGTH },
          }),
        ]);
      } else if (errorMessages.length) {
        setErrorMessages([]);
      }
    },
    [errorMessages.length]
  );
  return (
    <EuiMarkdownEditor
      aria-label={i18n.translate(
        'responseOpsRuleForm.ruleDetails.investigationGuide.editor.ariaLabel',
        {
          defaultMessage: 'Add guidelines for addressing alerts created by this rule',
        }
      )}
      placeholder={i18n.translate(
        'responseOpsRuleForm.ruleDetails.investigationGuide.editor.placeholder',
        {
          defaultMessage: 'Add guidelines for addressing alerts created by this rule',
        }
      )}
      css={css`
        .euiMarkdownFormat {
          word-wrap: break-word;
        }
      `}
      value={value}
      onChange={(blob) => setRuleParams({ investigation_guide: { blob } })}
      onParse={onParse}
      errors={errorMessages}
      height={200}
      data-test-subj="investigationGuideEditor"
      initialViewMode="editing"
    />
  );
}
