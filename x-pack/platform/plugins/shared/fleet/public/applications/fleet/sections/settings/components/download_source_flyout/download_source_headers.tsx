/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormErrorText,
  EuiFormRow,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useMemo, useState } from 'react';

import { i18n } from '@kbn/i18n';

import type { DownloadSourceFormInputsType } from './use_download_source_flyout_form';

export const DownloadSourceHeaders: React.FunctionComponent<{
  inputs: DownloadSourceFormInputsType;
}> = (props) => {
  const { inputs } = props;
  const {
    props: { onChange },
    value: keyValuePairs,
    formRowProps: { error: errors },
  } = inputs.headersInput;

  const [autoFocus, setAutoFocus] = useState(false);

  const handleKeyValuePairChange = useCallback(
    (index: number, field: 'key' | 'value', value: string) => {
      const updatedPairs = keyValuePairs.map((pair, i) => {
        if (i === index) {
          return {
            ...pair,
            [field]: value,
          };
        }
        return pair;
      });
      onChange(updatedPairs);
    },
    [keyValuePairs, onChange]
  );

  const addKeyValuePair = useCallback(() => {
    setAutoFocus(true);
    const updatedPairs = [...keyValuePairs, { key: '', value: '' }];
    onChange(updatedPairs);
  }, [keyValuePairs, onChange]);

  const deleteKeyValuePair = useCallback(
    (index: number) => {
      const updatedPairs = keyValuePairs.filter((_, i) => i !== index);
      onChange(updatedPairs);
    },
    [keyValuePairs, onChange]
  );

  const deleteButtonDisabled = false;
  const hasEmptyRow = keyValuePairs.some((pair) => pair.key === '' && pair.value === '');
  const addKeyValuePairButtonDisabled = hasEmptyRow;

  const displayErrors = (errorMessages?: string[]) => {
    return errorMessages?.length
      ? errorMessages.map((item, idx) => <EuiFormErrorText key={idx}>{item}</EuiFormErrorText>)
      : null;
  };

  const matchErrorsByIndex = useMemo(
    () => (index: number, errorType: 'key' | 'value') => {
      const headersErrors = errors as
        | Array<{
            message: string;
            index: number;
            hasKeyError: boolean;
            hasValueError: boolean;
          }>
        | undefined;
      return headersErrors
        ?.filter(
          (error) =>
            error.index === index && (errorType === 'key' ? error.hasKeyError : error.hasValueError)
        )
        .map((error) => error.message);
    },
    [errors]
  );

  const globalErrors = useMemo(() => {
    return (
      errors &&
      (errors as Array<{ index?: number; message: string }>)
        .filter((err) => err.index === undefined)
        .map(({ message }) => message)
    );
  }, [errors]);

  return (
    <>
      <EuiSpacer size="m" />
      <EuiTitle size="xxs">
        <h4>
          <FormattedMessage
            id="xpack.fleet.settings.editDownloadSourcesFlyout.headersTitle"
            defaultMessage="Headers"
          />
        </h4>
      </EuiTitle>
      <EuiSpacer size="s" />
      {keyValuePairs.map((pair, index) => {
        const keyErrors = matchErrorsByIndex(index, 'key');
        const valueErrors = matchErrorsByIndex(index, 'value');
        return (
          <div key={index}>
            {index > 0 && <EuiSpacer size="s" />}
            <EuiFlexGroup alignItems="flexStart" gutterSize="s">
              <EuiFlexItem>
                <EuiFormRow
                  fullWidth
                  label={
                    index === 0 ? (
                      <FormattedMessage
                        id="xpack.fleet.settings.editDownloadSourcesFlyout.headerKeyLabel"
                        defaultMessage="Key"
                      />
                    ) : undefined
                  }
                  error={displayErrors(keyErrors)}
                  isInvalid={(keyErrors?.length ?? 0) > 0}
                >
                  <EuiFieldText
                    isInvalid={(keyErrors?.length ?? 0) > 0}
                    data-test-subj={`downloadSourceHeadersKeyInput${index}`}
                    fullWidth
                    value={pair.key}
                    onChange={(e) => handleKeyValuePairChange(index, 'key', e.target.value)}
                    autoFocus={autoFocus && index === keyValuePairs.length - 1}
                    placeholder={i18n.translate(
                      'xpack.fleet.settings.editDownloadSourcesFlyout.headerKeyPlaceholder',
                      { defaultMessage: 'Key' }
                    )}
                  />
                </EuiFormRow>
              </EuiFlexItem>

              <EuiFlexItem>
                <EuiFormRow
                  fullWidth
                  label={
                    index === 0 ? (
                      <FormattedMessage
                        id="xpack.fleet.settings.editDownloadSourcesFlyout.headerValueLabel"
                        defaultMessage="Value"
                      />
                    ) : undefined
                  }
                  error={displayErrors(valueErrors)}
                  isInvalid={(valueErrors?.length ?? 0) > 0}
                >
                  <EuiFieldText
                    isInvalid={(valueErrors?.length ?? 0) > 0}
                    data-test-subj={`downloadSourceHeadersValueInput${index}`}
                    fullWidth
                    value={pair.value}
                    onChange={(e) => handleKeyValuePairChange(index, 'value', e.target.value)}
                    placeholder={i18n.translate(
                      'xpack.fleet.settings.editDownloadSourcesFlyout.headerValuePlaceholder',
                      { defaultMessage: 'Value' }
                    )}
                  />
                </EuiFormRow>
              </EuiFlexItem>

              <EuiFlexItem grow={false} style={{ marginTop: index === 0 ? 28 : 0 }}>
                <EuiButtonIcon
                  data-test-subj={`downloadSourceHeadersDeleteButton${index}`}
                  color="text"
                  onClick={() => deleteKeyValuePair(index)}
                  iconType="cross"
                  disabled={deleteButtonDisabled}
                  aria-label={i18n.translate(
                    'xpack.fleet.settings.editDownloadSourcesFlyout.deleteHeaderButton',
                    {
                      defaultMessage: 'Delete header',
                    }
                  )}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </div>
        );
      })}
      {displayErrors(globalErrors)}

      <EuiSpacer size="s" />
      <EuiButtonEmpty
        data-test-subj="downloadSourceHeaders.addRowButton"
        disabled={addKeyValuePairButtonDisabled}
        size="xs"
        flush="left"
        iconType="plusInCircle"
        onClick={addKeyValuePair}
      >
        <FormattedMessage
          id="xpack.fleet.settings.editDownloadSourcesFlyout.addHeaderButton"
          defaultMessage="Add header"
        />
      </EuiButtonEmpty>
    </>
  );
};
