/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { userEvent, waitFor } from '@storybook/test';
import { MemoryRouter } from 'react-router-dom';

import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';

import type { DataSetWithName, DataSource } from '../../common';
import { storybookDocLinksMock } from '../__stories__/doc_links_mock';
import { CreateDatasetWizardPage } from './create_dataset_wizard_page';

const dataSources: DataSource[] = [{ name: 'source-1', type: 's3', description: '', settings: {} }];

const initialDataSet: DataSetWithName = {
  name: 'logs-dataset',
  data_source: 'source-1',
  resource: 's3://bucket/*',
  description: '',
  settings: { format: 'csv' },
  mappings: {
    properties: {
      '@timestamp': { type: 'date', path: 'event_time' },
    },
  },
};

const noop = async () => {};

interface WizardStoryProps {
  saveErrorMessage: string;
}

const WizardStory = ({ saveErrorMessage }: WizardStoryProps) => (
  <MockAppHeaderProvider>
    <MemoryRouter initialEntries={[`/datasets/edit/${initialDataSet.name}`]}>
      <KibanaContextProvider
        services={{
          docLinks: storybookDocLinksMock,
          datasetsClient: {
            add: async () => {
              throw new Error(saveErrorMessage);
            },
            delete: noop,
          },
          dataSourcesClient: { add: noop },
        }}
      >
        <CreateDatasetWizardPage
          dataSources={dataSources}
          existingDataSetNames={[initialDataSet.name]}
          loadDataSets={noop}
          loadDataSources={noop}
          initialDataSet={initialDataSet}
        />
      </KibanaContextProvider>
    </MemoryRouter>
  </MockAppHeaderProvider>
);

const getByTestSubj = (root: HTMLElement, testSubj: string): HTMLElement => {
  const element = root.querySelector<HTMLElement>(`[data-test-subj="${testSubj}"]`);
  if (!element) {
    throw new Error(`Unable to find element with data-test-subj="${testSubj}"`);
  }
  return element;
};

const STEP_TEST_SUBJECTS_AFTER_FIRST = [
  'createDatasetWizardAdditionalStep',
  'createDatasetWizardMappingStep',
  'createDatasetWizardReviewStep',
] as const;

const meta: Meta<typeof WizardStory> = {
  component: WizardStory,
  title: 'data_federation/CreateDatasetWizardPage',
  args: {
    saveErrorMessage: 'validation_exception: [resource] must reference an existing bucket',
  },
  play: async ({ canvasElement }) => {
    for (const stepTestSubj of STEP_TEST_SUBJECTS_AFTER_FIRST) {
      await userEvent.click(getByTestSubj(canvasElement, 'nextButton'));
      await waitFor(() => getByTestSubj(canvasElement, stepTestSubj));
    }
    await userEvent.click(getByTestSubj(canvasElement, 'nextButton'));
    await waitFor(() => getByTestSubj(canvasElement, 'createDatasetWizardSaveError'));
  },
};

export default meta;
type Story = StoryObj<typeof WizardStory>;

export const SaveError: Story = {};

export const SaveErrorLongMessage: Story = {
  args: {
    saveErrorMessage:
      'illegal_argument_exception: failed to create dataset [logs-dataset]: unable to read ' +
      'objects under [s3://bucket/*] using data source [source-1]; the configured credentials ' +
      'were rejected by the remote service (403 Forbidden). Verify the data source ' +
      'authentication settings and that the bucket policy grants list and read access.',
  },
};
