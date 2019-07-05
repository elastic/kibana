/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect } from 'react';
import { EuiCodeEditor } from '@elastic/eui';

interface Props {
  setGetDataHandler: (handler: () => { isValid: boolean; data: Mappings }) => void;
  FormattedMessage: typeof ReactIntl.FormattedMessage;
  defaultValue?: Mappings;
}

export interface Mappings {
  [key: string]: any;
}

export const MappingsEditor = ({
  setGetDataHandler,
  FormattedMessage,
  defaultValue = {},
}: Props) => {
  const [mappings, setMappings] = useState<string>(JSON.stringify(defaultValue, null, 2));

  const getFormData = () => {
    try {
      const parsed: Mappings = JSON.parse(mappings);
      return {
        data: parsed,
        isValid: true,
      };
    } catch (e) {
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
          id="xpack.index_management.mappingsEditor"
          defaultMessage="Index mappings editor"
        />
      }
      onChange={(value: string) => {
        setMappings(value);
      }}
      data-test-subj="mappingsEditor"
    />
  );
};
