/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { storiesOf } from '@storybook/react';
import { ThemeProvider } from 'styled-components';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';
import { autocomplete } from '../../../../../../../../src/plugins/data/public';
import { SuggestionItem } from '../suggestion_item';

const suggestion: autocomplete.QuerySuggestion = {
  description: 'Description...',
  end: 3,
  start: 1,
  text: 'Text...',
  type: autocomplete.QuerySuggestionsTypes.value,
};

storiesOf('components/SuggestionItem', module).add('example', () => (
  <ThemeProvider
    theme={() => ({
      eui: euiLightVars,
      darkMode: false,
    })}
  >
    <SuggestionItem suggestion={suggestion} />
  </ThemeProvider>
));
