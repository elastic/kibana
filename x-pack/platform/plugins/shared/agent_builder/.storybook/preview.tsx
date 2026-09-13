/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { configure } from '@storybook/test';
import type { Decorator } from '@storybook/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';

// Map data-test-subj to the testId attribute so play/findByTestId works
configure({ testIdAttribute: 'data-test-subj' });

const I18nDecorator: Decorator = (storyFn) => <I18nProvider>{storyFn()}</I18nProvider>;

export const decorators = [I18nDecorator];
