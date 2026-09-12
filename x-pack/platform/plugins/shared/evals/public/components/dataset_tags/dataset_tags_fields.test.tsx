/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { MAX_TAGS_PER_DATASET } from '@kbn/evals-common';
import { DatasetTagsFields } from './dataset_tags_fields';

const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <I18nProvider>{children}</I18nProvider>
);

const renderFields = (props: Partial<React.ComponentProps<typeof DatasetTagsFields>> = {}) => {
  const onTagsChange = jest.fn();
  const onMaturityChange = jest.fn();

  render(
    <DatasetTagsFields
      tags={[]}
      maturity={null}
      onTagsChange={onTagsChange}
      onMaturityChange={onMaturityChange}
      {...props}
    />,
    { wrapper: Wrapper }
  );

  return { onTagsChange, onMaturityChange };
};

const typeTag = async (value: string) => {
  await userEvent.type(screen.getByTestId('datasetTagsComboBox').querySelector('input')!, value);
  await userEvent.keyboard('{Enter}');
};

describe('DatasetTagsFields', () => {
  it('lowercases and trims a new tag, matching what the server stores', async () => {
    const { onTagsChange } = renderFields();

    await typeTag('  Golden  ');

    expect(onTagsChange).toHaveBeenCalledWith(['golden']);
  });

  it('appends to the existing tags', async () => {
    const { onTagsChange } = renderFields({ tags: ['golden'] });

    await typeTag('esql');

    expect(onTagsChange).toHaveBeenCalledWith(['golden', 'esql']);
  });

  it('ignores a tag the dataset already carries', async () => {
    const { onTagsChange } = renderFields({ tags: ['golden'] });

    await typeTag('GOLDEN');

    expect(onTagsChange).not.toHaveBeenCalled();
  });

  it('explains why a tag with unsupported characters was rejected', async () => {
    const { onTagsChange } = renderFields();

    await typeTag('two words');

    expect(onTagsChange).not.toHaveBeenCalled();
    expect(screen.getByText(/is not a valid tag/)).toBeInTheDocument();
  });

  it('stops at the tag limit', async () => {
    const tags = Array.from({ length: MAX_TAGS_PER_DATASET }, (_, index) => `tag-${index}`);
    const { onTagsChange } = renderFields({ tags });

    await typeTag('one-too-many');

    expect(onTagsChange).not.toHaveBeenCalled();
    expect(
      screen.getByText(`A dataset can have at most ${MAX_TAGS_PER_DATASET} tags.`)
    ).toBeInTheDocument();
  });

  it('offers tags already in use as suggestions', async () => {
    const { onTagsChange } = renderFields({ suggestedTags: ['golden', 'esql'] });

    await userEvent.click(screen.getByTestId('datasetTagsComboBox').querySelector('input')!);
    await userEvent.click(screen.getByRole('option', { name: 'esql' }));

    expect(onTagsChange).toHaveBeenCalledWith(['esql']);
  });

  it('reports the chosen maturity level', async () => {
    const { onMaturityChange } = renderFields();

    await userEvent.selectOptions(screen.getByTestId('datasetMaturitySelect'), 'cleaned');

    expect(onMaturityChange).toHaveBeenCalledWith('cleaned');
  });

  it('clears maturity when the level is unset', async () => {
    const { onMaturityChange } = renderFields({ maturity: 'golden' });

    await userEvent.selectOptions(screen.getByTestId('datasetMaturitySelect'), '');

    expect(onMaturityChange).toHaveBeenCalledWith(null);
  });
});
