/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { userEvent, waitFor } from '@storybook/test';

import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';

import { docLinksMock } from '../../../doc_links_mock';
import type { MappingEditorValue } from './mapping_editor';
import { MappingEditor } from './mapping_editor';
import { emptyMappingEditorValue } from './constants';

const meta: Meta<typeof MappingEditor> = {
  component: MappingEditor,
  title: 'data_federation/MappingEditor',
};

export default meta;
type Story = StoryObj<typeof MappingEditor>;

const PopulatedStory = () => {
  const [value, setValue] = React.useState<MappingEditorValue>(() => ({
    ...emptyMappingEditorValue,
    dynamic: false,
    fields: [
      {
        id: '0',
        name: '@timestamp',
        path: 'event_time',
        type: 'date',
        format: 'yyyy-MM-dd HH:mm:ss',
      },
      {
        id: '1',
        name: 'request_id',
        path: '',
        type: 'keyword',
        format: '',
      },
      {
        id: '2',
        name: 'status_code',
        path: '',
        type: 'integer',
        format: '',
      },
    ],
  }));

  return (
    <KibanaContextProvider services={{ docLinks: docLinksMock }}>
      <MappingEditor value={value} onChange={setValue} />
    </KibanaContextProvider>
  );
};

const EmptyStory = () => {
  const [value, setValue] = React.useState<MappingEditorValue>(() => ({
    ...emptyMappingEditorValue,
  }));
  return (
    <KibanaContextProvider services={{ docLinks: docLinksMock }}>
      <MappingEditor value={value} onChange={setValue} />
    </KibanaContextProvider>
  );
};

const DuplicateFieldNamesStory = () => {
  const [value, setValue] = React.useState<MappingEditorValue>(() => ({
    ...emptyMappingEditorValue,
    dynamic: false,
    fields: [
      {
        id: '0',
        name: 'status_code',
        path: 'status',
        type: 'integer',
        format: '',
      },
      {
        id: '1',
        name: 'status_code',
        path: 'http_status',
        type: 'keyword',
        format: '',
      },
    ],
  }));

  return (
    <KibanaContextProvider services={{ docLinks: docLinksMock }}>
      <MappingEditor value={value} onChange={setValue} />
    </KibanaContextProvider>
  );
};

const getByTestSubj = (root: HTMLElement, testSubj: string): HTMLElement => {
  const element = root.querySelector<HTMLElement>(`[data-test-subj="${testSubj}"]`);
  if (!element) {
    throw new Error(`Unable to find element with data-test-subj="${testSubj}"`);
  }
  return element;
};

export const Empty: Story = {
  render: () => {
    return <EmptyStory />;
  },
};

export const Populated: Story = {
  render: () => {
    return <PopulatedStory />;
  },
};

export const ValidationError: Story = {
  render: () => {
    return <DuplicateFieldNamesStory />;
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(getByTestSubj(canvasElement, 'dataFederationMappingEditorEditField'));
    await waitFor(() => getByTestSubj(canvasElement, 'dataFederationMappingEditorUpdateField'));
    await userEvent.click(getByTestSubj(canvasElement, 'dataFederationMappingEditorUpdateField'));
    await waitFor(() => getByTestSubj(canvasElement, 'dataFederationMappingEditorValidationError'));
  },
};
