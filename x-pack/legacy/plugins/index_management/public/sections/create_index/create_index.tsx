/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useRef, useState } from 'react';
import { EuiPageContent, EuiButton, EuiSpacer, EuiTitle } from '@elastic/eui';

import { MappingsEditor, Mappings } from '../../../static/ui';

type GetMappingsEditorDataHandler = () => Mappings;

export const CreateIndex = () => {
  const getMappingsEditorData = useRef<GetMappingsEditorDataHandler>(() => ({}));
  const [mappings, setMappings] = useState<Mappings>({});

  const setGetMappingsEditorDataHandler = (handler: GetMappingsEditorDataHandler) =>
    (getMappingsEditorData.current = handler);

  const onClick = () => {
    setMappings(getMappingsEditorData.current());
  };

  return (
    <EuiPageContent>
      <EuiTitle size="l">
        <React.Fragment>Create Index</React.Fragment>
      </EuiTitle>
      <EuiSpacer size="xl" />

      <MappingsEditor setGetDataHandler={setGetMappingsEditorDataHandler} />

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
      <div>{JSON.stringify(mappings, null, 2)}</div>
    </EuiPageContent>
  );
};
