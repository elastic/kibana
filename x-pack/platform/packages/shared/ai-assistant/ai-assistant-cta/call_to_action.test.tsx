/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiThemeProvider } from '@elastic/eui';
import { mountWithIntl } from '@kbn/test-jest-helpers';

import { AssistantCallToAction, AssistantCallToActionProps } from './call_to_action';
import { translations } from './call_to_action.translations';

describe('AssistantCallToAction', () => {
  const mountComponent = async (props: Partial<AssistantCallToActionProps> = {}) =>
    mountWithIntl(<AssistantCallToAction {...props} />, { wrappingComponent: EuiThemeProvider });

  it('renders with default title and no description or children', async () => {
    const component = await mountComponent();

    expect(component.contains(translations.title)).toBeTruthy();
    expect(component.contains(translations.description)).not.toBeTruthy();
  });

  it('renders with a custom title and description', async () => {
    const title = 'Custom Title';
    const description = 'Custom Description';
    const component = await mountComponent({ title, description });

    expect(component.contains(title)).toBeTruthy();
    expect(component.contains(description)).toBeTruthy();
  });

  it('renders with children', async () => {
    const childText = 'Child Element';
    const component = await mountComponent({ children: <div>{childText}</div> });

    expect(component.contains(childText)).toBeTruthy();
  });
});
