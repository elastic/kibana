/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect, Fragment } from 'react';
import { EuiCodeEditor, EuiSpacer, EuiCallOut } from '@elastic/eui';

interface Props {
  setGetDataHandler: (handler: () => { isValid: boolean; data: Mappings }) => void;
  FormattedMessage: typeof ReactIntl.FormattedMessage;
  defaultValue?: Mappings;
  areErrorsVisible?: boolean;
}

export interface Mappings {
  [key: string]: any;
}

export const MappingsEditor = ({
  setGetDataHandler,
  FormattedMessage,
  areErrorsVisible = true,
  defaultValue = {},
}: Props) => {
  const [mappings, setMappings] = useState<string>(JSON.stringify(defaultValue, null, 2));
  const [error, setError] = useState<string | null>(null);

  const getFormData = () => {
    setError(null);
    try {
      const parsed: Mappings = JSON.parse(mappings);
      return {
        data: parsed,
        isValid: true,
      };
    } catch (e) {
      setError(e.message);
      return {
        isValid: false,
        data: {},
      };
    }
  };

  useEffect(() => {
    setGetDataHandler(getFormData);
  }, [mappings]);

  return (
    <Fragment>
      <EuiCodeEditor
        mode="json"
        theme="textmate"
        width="100%"
        value={mappings}
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
        aria-label={
          <FormattedMessage
            id="xpack.idxMgmt.mappingsEditor.mappingsEditorAriaLabel"
            defaultMessage="Index mappings editor"
          />
        }
        onChange={(value: string) => {
          setMappings(value);
        }}
        data-test-subj="mappingsEditor"
      />
      {areErrorsVisible && error && (
        <Fragment>
          <EuiSpacer size="m" />
          <EuiCallOut
            title={
              <FormattedMessage
                id="xpack.idxMgmt.mappingsEditor.formatError"
                defaultMessage="JSON format error"
              />
            }
            color="danger"
            iconType="alert"
          >
            <p data-test-subj="errors">{error}</p>
          </EuiCallOut>
        </Fragment>
      )}
    </Fragment>
  );
};
