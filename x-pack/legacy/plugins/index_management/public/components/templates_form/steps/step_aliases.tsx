/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiButtonEmpty,
  EuiSpacer,
  EuiFormRow,
  EuiText,
  EuiCodeEditor,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { aliasesDocumentationLink } from '../../../lib/documentation_links';
import { StepProps } from '../types';

export const StepAliases: React.FunctionComponent<StepProps> = ({
  template,
  updateTemplate,
  errors,
}) => {
  const { aliases } = template;
  const { aliases: aliasesError } = errors;

  return (
    <div data-test-subj="stepAliases">
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiTitle>
            <h3 data-test-subj="stepTitle">
              <FormattedMessage
                id="xpack.idxMgmt.templatesForm.stepAliases.stepTitle"
                defaultMessage="Aliases (optional)"
              />
            </h3>
          </EuiTitle>

          <EuiSpacer size="s" />

          <EuiText>
            <p>
              <FormattedMessage
                id="xpack.idxMgmt.templatesForm.stepAliases.aliasesDescription"
                defaultMessage="Use aliases to refer to the destination index by different names when making requests against Elasticsearch APIs."
              />
            </p>
          </EuiText>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            flush="right"
            href={aliasesDocumentationLink}
            target="_blank"
            iconType="help"
          >
            <FormattedMessage
              id="xpack.idxMgmt.templatesForm.stepAliases.docsButtonLabel"
              defaultMessage="Index aliases docs"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="l" />

      {/* Aliases code editor */}
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.idxMgmt.templatesForm.stepAliases.fieldAliasesLabel"
            defaultMessage="Aliases"
          />
        }
        isInvalid={Boolean(aliasesError)}
        error={aliasesError}
        fullWidth
      >
        <EuiCodeEditor
          mode="json"
          theme="textmate"
          width="100%"
          setOptions={{
            showLineNumbers: false,
            tabSize: 2,
            maxLines: Infinity,
          }}
          editorProps={{
            $blockScrolling: Infinity,
          }}
          showGutter={false}
          minLines={6}
          aria-label={i18n.translate(
            'xpack.idxMgmt.templatesForm.stepAliases.fieldAliasesAriaLabel',
            {
              defaultMessage: 'Aliases code editor',
            }
          )}
          value={aliases}
          onChange={(newAliases: string) => {
            updateTemplate({ aliases: newAliases });
          }}
          data-test-subj="aliasesEditor"
        />
      </EuiFormRow>
    </div>
  );
};
