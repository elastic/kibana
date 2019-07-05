/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useRef, useState } from 'react';
import { EuiPageContent, EuiButton, EuiSpacer, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { MappingsEditor, Mappings } from '../../../static/ui';

type GetMappingsEditorDataHandler = () => { isValid: boolean; data: Mappings };

const initialData = {
  properties: {
    title: { type: 'text' },
    name: { type: 'text' },
    age: { type: 'integer' },
    created: {
      type: 'date',
      format: 'strict_date_optional_time||epoch_millis',
    },
  },
};

export const CreateIndex = () => {
  const getMappingsEditorData = useRef<GetMappingsEditorDataHandler>(() => ({
    isValid: true,
    data: {},
  }));
  const [mappings, setMappings] = useState<Mappings>(initialData);
  const [isMappingsValid, setIsMappingsValid] = useState<boolean>(true);

  const setGetMappingsEditorDataHandler = (handler: GetMappingsEditorDataHandler) =>
    (getMappingsEditorData.current = handler);

  const onClick = () => {
    const { isValid, data } = getMappingsEditorData.current();
    setIsMappingsValid(isValid);
    setMappings(data);
  };

  return (
    <EuiPageContent>
      <EuiTitle size="l">
        <React.Fragment>Create Index</React.Fragment>
      </EuiTitle>
      <EuiSpacer size="xl" />

      <MappingsEditor
        setGetDataHandler={setGetMappingsEditorDataHandler}
        FormattedMessage={FormattedMessage}
        defaultValue={initialData}
      />

      <EuiSpacer size="xl" />
      <EuiButton color="primary" fill onClick={onClick}>
        Get mappings data
      </EuiButton>

      <EuiSpacer size="xl" />
      <hr />

      <EuiSpacer size="l" />
      <EuiTitle size="m">
        <React.Fragment>Mappings editor data:</React.Fragment>
      </EuiTitle>

      <EuiSpacer size="l" />
      {isMappingsValid ? (
        <pre>
          <code>{JSON.stringify(mappings, null, 2)}</code>
        </pre>
      ) : (
        <div>The mappings JSON data is not valid.</div>
      )}
    </EuiPageContent>
  );
};
