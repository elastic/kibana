/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { EuiCode, EuiFieldText, EuiFormRow, EuiLink, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

const VALUE_FIELD = 'value';
const COPY_FROM_FIELD = 'copy_from';

export const ValueField = ({ toggleCustom }: { toggleCustom: () => void }) => {
  const { register, unregister } = useFormContext();
  const { ref, ...inputProps } = register(VALUE_FIELD, { required: true });

  useEffect(() => {
    return () => {
      unregister(VALUE_FIELD);
    };
  }, [unregister]);

  return (
    <EuiFormRow
      label={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.setValueFieldLabel',
        { defaultMessage: 'Value' }
      )}
      helpText={
        <FormattedMessage
          id="xpack.streams.streamDetailView.managementTab.enrichment.processor.setValueFieldHelpText"
          defaultMessage="The value to be set for the field."
        />
      }
      labelAppend={
        <EuiText size="xs">
          <EuiLink onClick={toggleCustom} data-test-subj="toggleCopyFromField">
            <FormattedMessage
              id="xpack.streams.streamDetailView.managementTab.enrichment.processor.setToggleCopyFromFieldLabel"
              defaultMessage="Use copy from field"
            />
          </EuiLink>
        </EuiText>
      }
      fullWidth
    >
      <EuiFieldText {...inputProps} inputRef={ref} />
    </EuiFormRow>
  );
};

export const CopyFromField = ({ toggleCustom }: { toggleCustom: () => void }) => {
  const { register, unregister } = useFormContext();
  const { ref, ...inputProps } = register(COPY_FROM_FIELD, { required: true });

  useEffect(() => {
    return () => {
      unregister(COPY_FROM_FIELD);
    };
  }, [unregister]);

  return (
    <EuiFormRow
      label={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.setCopyFromFieldLabel',
        {
          defaultMessage: 'Copy from',
        }
      )}
      helpText={
        <FormattedMessage
          id="xpack.streams.streamDetailView.managementTab.enrichment.processor.setCopyFromFieldHelpText"
          defaultMessage="Field to copy into {field}."
          values={{
            field: <EuiCode>{'Field'}</EuiCode>,
          }}
        />
      }
      labelAppend={
        <EuiText size="xs">
          <EuiLink onClick={toggleCustom} data-test-subj="toggleValueField">
            <FormattedMessage
              id="xpack.streams.streamDetailView.managementTab.enrichment.processor.setToggleValueFieldLabel"
              defaultMessage="Use value field"
            />
          </EuiLink>
        </EuiText>
      }
      fullWidth
    >
      <EuiFieldText {...inputProps} inputRef={ref} />
    </EuiFormRow>
  );
};

export const SetValueOrCopyFromField = () => {
  const { getValues } = useFormContext();
  const isCopyFromDefined =
    getValues(COPY_FROM_FIELD) !== undefined && getValues(COPY_FROM_FIELD) !== '';
  const [isCopyFromField, setIsCopyFromField] = useState<boolean>(isCopyFromDefined);

  const toggleCustom = useCallback(() => {
    setIsCopyFromField((prev) => !prev);
  }, []);

  return !isCopyFromField ? (
    <ValueField toggleCustom={toggleCustom} />
  ) : (
    <CopyFromField toggleCustom={toggleCustom} />
  );
};
