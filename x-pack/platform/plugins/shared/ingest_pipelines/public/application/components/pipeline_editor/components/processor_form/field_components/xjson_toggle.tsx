/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, {
  FunctionComponent,
  useCallback,
  useEffect,
  useState,
  useMemo,
  MouseEventHandler,
} from 'react';
import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';
import { EuiLink, EuiText } from '@elastic/eui';
import { EDITOR_PX_HEIGHT, isXJsonValue } from '../processors/shared';
import { ComboBoxField, Field, FieldHook } from '../../../../../../shared_imports';

import { XJsonEditor } from '.';

type FieldType = 'text' | 'combox';

interface Props {
  field: FieldHook;
  disabled?: boolean;
  handleIsJson: Function;
  fieldType: FieldType;
}
interface ToggleProps {
  field: FieldHook;
  disabled?: boolean;
  toggleJson: MouseEventHandler;
  fieldType: FieldType;
}

const FieldToToggle: FunctionComponent<ToggleProps> = ({
  field,
  disabled,
  toggleJson,
  fieldType,
}) => {
  if (fieldType === 'text') {
    return (
      <Field
        data-test-subj="textValueField"
        field={field}
        euiFieldProps={{ disabled }}
        labelAppend={
          <EuiText size="xs">
            <EuiLink onClick={toggleJson} data-test-subj="toggleTextField" disabled={disabled}>
              <FormattedMessage
                id="xpack.ingestPipelines.pipelineEditor.toggleJson.useJsonFormat"
                defaultMessage="Define as JSON"
              />
            </EuiLink>
          </EuiText>
        }
      />
    );
  }

  if (fieldType === 'combox') {
    return (
      <ComboBoxField
        data-test-subj="comboxValueField"
        field={field}
        euiFieldProps={{ disabled }}
        labelAppend={
          <EuiText size="xs">
            <EuiLink onClick={toggleJson} data-test-subj="toggleTextField" disabled={disabled}>
              <FormattedMessage
                id="xpack.ingestPipelines.pipelineEditor.toggleJson.useJsonFormat"
                defaultMessage="Define as JSON"
              />
            </EuiLink>
          </EuiText>
        }
      />
    );
  }
};

export const XJsonToggle: FunctionComponent<Props> = ({
  field,
  disabled = false,
  handleIsJson,
  fieldType,
}) => {
  const { value, setValue } = field;
  const [defineAsJson, setDefineAsJson] = useState<boolean | undefined>(undefined);

  const toggleJson = useCallback(() => {
    const defaultValue = fieldType === 'text' ? '' : [];
    const newValueIsJson = !defineAsJson;
    setValue(newValueIsJson ? '{}' : defaultValue);
    setDefineAsJson(newValueIsJson);
    handleIsJson(newValueIsJson);
  }, [defineAsJson, fieldType, handleIsJson, setValue]);

  useEffect(() => {
    if (defineAsJson === undefined) {
      setDefineAsJson(isXJsonValue(value));
      handleIsJson(isXJsonValue(value));
    }
  }, [defineAsJson, handleIsJson, setValue, value]);

  const mustRenderXJsonEditor = useMemo(() => {
    if (defineAsJson === undefined) {
      return isXJsonValue(value);
    }
    return defineAsJson;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defineAsJson]);

  return mustRenderXJsonEditor ? (
    <XJsonEditor
      field={field as FieldHook<string>}
      disabled={disabled}
      editorProps={{
        'data-test-subj': 'jsonValueField',
        height: disabled ? EDITOR_PX_HEIGHT.extraSmall : EDITOR_PX_HEIGHT.medium,
        'aria-label': i18n.translate(
          'xpack.ingestPipelines.pipelineEditor.toggleJson.valueAriaLabel',
          {
            defaultMessage: 'Value editor',
          }
        ),
        options: { readOnly: disabled },
        labelAppend: (
          <EuiText size="xs">
            <EuiLink onClick={toggleJson} data-test-subj="toggleJsonField" disabled={disabled}>
              <FormattedMessage
                id="xpack.ingestPipelines.pipelineEditor.toggleJson.useTextFormat"
                defaultMessage="Define as text"
              />
            </EuiLink>
          </EuiText>
        ),
      }}
    />
  ) : (
    <FieldToToggle
      field={field}
      disabled={disabled}
      toggleJson={toggleJson}
      fieldType={fieldType}
    />
  );
};
