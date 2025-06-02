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
import {
  FieldDefinitionConfigAdvancedParameters,
  isSchema,
  recursiveRecord,
} from '@kbn/streams-schema';
import { useBoolean } from '@kbn/react-hooks';
import { SchemaField } from '../types';
import { useKibana } from '../../../../hooks/use_kibana';

const label = i18n.translate('xpack.streams.advancedFieldMappingOptions.label', {
  defaultMessage: 'Advanced field mapping parameters',
});

export const AdvancedFieldMappingOptions = ({
  field,
  onChange,
  onValidate,
  isEditing,
}: {
  field: SchemaField;
  onChange: (field: Partial<SchemaField>) => void;
  onValidate?: (isValid: boolean) => void;
  isEditing: boolean;
}) => {
  const { core } = useKibana();

  const accordionId = useGeneratedHtmlId({ prefix: 'accordionID' });

  const [hasParsingError, { on: markAsParsingError, off: resetParsingErrorFlag }] =
    useBoolean(false);

  const isInvalid = hasParsingError || !getValidFlag(field.additionalParameters);

  const jsonOptions = useMemo(
    () => (field.additionalParameters ? JSON.stringify(field.additionalParameters, null, 2) : ''),
    [field.additionalParameters]
  );

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
              onChange={(value) => {
                try {
                  const additionalParameters =
                    value === ''
                      ? undefined
                      : (JSON.parse(value) as FieldDefinitionConfigAdvancedParameters);
                  onChange({ additionalParameters });
                  if (onValidate) onValidate(getValidFlag(additionalParameters));
                  resetParsingErrorFlag();
                } catch (error: unknown) {
                  markAsParsingError();
                  if (onValidate) onValidate(false);
                }
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
