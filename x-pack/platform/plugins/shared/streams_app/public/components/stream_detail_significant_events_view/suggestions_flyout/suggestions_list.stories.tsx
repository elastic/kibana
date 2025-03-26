/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Meta, StoryFn } from '@storybook/react';
import React, { useState } from 'react';
import { EuiPanel } from '@elastic/eui';
import { css } from '@emotion/css';
import { without } from 'lodash';
import { SignificantEventSuggestionsList } from './suggestions_list';
import { previews } from './__storybook_mocks__/use_suggestion_preview';

const stories: Meta<{}> = {
  title: 'Streams/SignificantEventSuggestionsList',
  component: SignificantEventSuggestionsList,
};

const suggestions = previews.map(({ suggestion }) => suggestion);

export const Suggestions: StoryFn<{}> = () => {
  const [selected, setSelected] = useState(suggestions);

  return (
    <EuiPanel
      className={css`
        width: 600px;
      `}
    >
      <SignificantEventSuggestionsList
        suggestions={suggestions}
        name="logs*"
        onSuggestionClick={(suggestion) => {
          setSelected((prev) =>
            prev.includes(suggestion) ? without(prev, suggestion) : prev.concat(suggestion)
          );
        }}
        selected={selected}
      />
    </EuiPanel>
  );
};

export default stories;
