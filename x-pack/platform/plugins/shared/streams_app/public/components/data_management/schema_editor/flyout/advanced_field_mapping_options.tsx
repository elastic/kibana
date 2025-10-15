/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiAccordion,
  EuiCodeBlock,
  EuiFormRow,
  EuiLink,
  EuiPanel,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { CodeEditor } from '@kbn/code-editor';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { FieldDefinitionConfigAdvancedParameters } from '@kbn/streams-schema';
import { isSchema, recursiveRecord } from '@kbn/streams-schema';
import { useBoolean } from '@kbn/react-hooks';
import type { SchemaField } from '../types';
import { useKibana } from '../../../../hooks/use_kibana';

const label = i18n.translate('xpack.streams.advancedFieldMappingOptions.label', {
  defaultMessage: 'Advanced field mapping parameters',
});

export const AdvancedFieldMappingOptions = ({
  value,
  onChange,
  onValidate,
  isEditing,
}: {
  value: SchemaField['additionalParameters'];
  onChange: (additionalParameters: SchemaField['additionalParameters']) => void;
  onValidate?: (isValid: boolean) => void;
  isEditing: boolean;
}) => {
  const { core } = useKibana();

  const accordionId = useGeneratedHtmlId({ prefix: 'accordionID' });

  const [hasParsingError, { on: markAsParsingError, off: resetParsingErrorFlag }] =
    useBoolean(false);

  const isInvalid = hasParsingError || !getValidFlag(value);

  const jsonOptions = useMemo(() => (value ? JSON.stringify(value, null, 2) : ''), [value]);

  return (
    <EuiAccordion id={accordionId} buttonContent={label}>
      <EuiPanel color="subdued">
        <EuiFormRow
          isInvalid={isInvalid}
          error={
            isInvalid
              ? i18n.translate('xpack.streams.advancedFieldMappingOptions.error', {
                  defaultMessage:
                    'Invalid advanced field mapping parameters. It should be defined as a JSON object.',
                })
              : undefined
          }
          label={
            <FormattedMessage
              id="xpack.streams.advancedFieldMappingOptions.docs.label"
              defaultMessage="Parameters can be defined with JSON. {link}"
              values={{
                link: (
                  <EuiLink
                    data-test-subj="streamsAppAdvancedFieldMappingOptionsViewDocumentationLink"
                    href={core.docLinks.links.elasticsearch.mappingParameters}
                    target="_blank"
                    external
                  >
                    <FormattedMessage
                      id="xpack.streams.indexPattern.randomSampling.learnMore"
                      defaultMessage="View documentation."
                    />
                  </EuiLink>
                ),
              }}
            />
          }
        >
          {isEditing ? (
            <CodeEditor
              height={120}
              languageId="json"
              value={jsonOptions}
              onChange={(updatedValue) => {
                try {
                  const additionalParameters =
                    updatedValue === ''
                      ? undefined
                      : (JSON.parse(updatedValue) as FieldDefinitionConfigAdvancedParameters);
                  onChange(additionalParameters);
                  if (onValidate) onValidate(getValidFlag(additionalParameters));
                  resetParsingErrorFlag();
                } catch (error: unknown) {
                  markAsParsingError();
                  if (onValidate) onValidate(false);
                }
              }}
              options={{
                automaticLayout: true,
              }}
            />
          ) : (
            <EuiCodeBlock language="json" isCopyable>
              {jsonOptions}
            </EuiCodeBlock>
          )}
        </EuiFormRow>
      </EuiPanel>
    </EuiAccordion>
  );
};

const getValidFlag = (additionalParameters?: FieldDefinitionConfigAdvancedParameters) => {
  return Boolean(
    !additionalParameters ||
      additionalParameters === '' ||
      isSchema(recursiveRecord, additionalParameters)
  );
};
