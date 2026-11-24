/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The styles that Elastic Charts needs to size and place a chart. The Kibana app has them already,
// and Storybook does not, so a chart in a story, such as a sparkline, is invisible without them.
import '@elastic/charts/dist/theme_only_light.css';
import { StreamsAppStorybookDecorator } from './storybook_decorator';

export const decorators = [StreamsAppStorybookDecorator];
