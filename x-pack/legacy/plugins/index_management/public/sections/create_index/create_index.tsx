/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useRef, useState, Fragment } from 'react';
import { EuiPageContent, EuiButton, EuiSpacer, EuiTitle } from '@elastic/eui';

import { MappingsEditor, Mappings, State as MappingsState } from '../../../static/ui';

type GetMappingsEditorDataHandler = () => Promise<{ isValid: boolean; data: Mappings }>;

const initialData = {
  dynamic: 'strict',
  date_detection: false,
  numeric_detection: true,
  dynamic_date_formats: ['MM/dd/yyyy'],
  properties: {
    title: {
      type: 'text',
      store: true,
      index: false,
      fielddata: true,
    },
    someObject: {
      type: 'object',
      store: true,
      index: true,
      fielddata: true,
      properties: {
        title: {
          type: 'text',
          store: true,
          index: false,
          fielddata: true,
        },
        myDate: {
          type: 'date',
          store: true,
        },
        superNested: {
          type: 'object',
          store: true,
          index: true,
          fielddata: true,
          properties: {
            lastName: {
              type: 'text',
              store: true,
              index: false,
              fielddata: true,
            },
            name: {
              type: 'text',
              store: true,
              index: true,
              fielddata: true,
            },
          },
        },
      },
    },
    someKeyword: {
      type: 'text',
      store: true,
      index: false,
      fielddata: true,
    },
  },
};

export const CreateIndex = () => {
  const getMappingsEditorData = useRef<GetMappingsEditorDataHandler>(() =>
    Promise.resolve({
      isValid: true,
      data: {},
    })
  );
  const [isFormSubmitted, setIsFormSubmitted] = useState<boolean>(false);
  const [mappings, setMappings] = useState<Mappings>(initialData);
  const [mappingsState, setMappingsState] = useState<Partial<MappingsState>>({
    isValid: true,
    isEditingProperty: false,
  });

  const setGetMappingsEditorDataHandler = (handler: GetMappingsEditorDataHandler) =>
    (getMappingsEditorData.current = handler);

  const onClick = async () => {
    const { isValid, data } = await getMappingsEditorData.current();
    // eslint-disable-next-line no-console
    console.log(isValid, data);
    setMappingsState(prev => ({ ...prev, isValid }));
    setMappings(data);
    setIsFormSubmitted(true);
  };

  return (
    <EuiPageContent>
      <EuiTitle size="l">
        <h1>Index Mappings...</h1>
      </EuiTitle>
      <EuiSpacer size="xl" />

      <MappingsEditor
        setGetDataHandler={setGetMappingsEditorDataHandler}
        onStateUpdate={setMappingsState}
        // defaultValue={initialData}
      />

      <EuiSpacer size="xl" />
      <hr />
      <EuiSpacer size="xl" />
      <p>
        <em>Everything below is OUTSIDE the MappingsEditor</em>
      </p>
      <EuiSpacer size="xl" />
      {isFormSubmitted && mappingsState.isEditingProperty && (
        <Fragment>
          <p>
            Warning: You are in the middle of editing a property. Please save the property before
            continuing.
          </p>
          <EuiSpacer size="xl" />
        </Fragment>
      )}
      <EuiButton
        color="primary"
        fill
        onClick={onClick}
        isDisabled={isFormSubmitted && (mappingsState.isEditingProperty || !mappingsState.isValid)}
      >
        Send form
      </EuiButton>

      <EuiSpacer size="xl" />
      <EuiTitle size="m">
        <h3>Mappings editor data:</h3>
      </EuiTitle>

      <EuiSpacer size="l" />
      {mappingsState.isValid ? (
        <pre>
          <code>{JSON.stringify(mappings, null, 2)}</code>
        </pre>
      ) : (
        <div>The mappings JSON data is not valid.</div>
      )}
    </EuiPageContent>
  );
};
