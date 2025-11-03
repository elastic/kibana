/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryFn } from '@storybook/react';
import React from 'react';
import { noop } from 'lodash';
import { ConnectorListButtonBase } from './connector_list_button';
import type { AIFeatures } from '../../hooks/use_ai_features';

const stories: Meta<{}> = {
  title: 'Streams/Components/ConnectorListButton',
  component: ConnectorListButtonBase,
};

export default stories;

export const Loading: StoryFn<{}> = () => {
  return (
    <ConnectorListButtonBase
      buttonProps={{
        iconType: 'sparkles',
        fill: true,
        children: 'Generate',
      }}
      aiFeatures={null}
    />
  );
};

export const NotEnabled: StoryFn<{}> = () => {
  return (
    <ConnectorListButtonBase
      buttonProps={{
        iconType: 'sparkles',
        fill: true,
        children: 'Generate',
      }}
      aiFeatures={{
        couldBeEnabled: true,
        enabled: false,
        genAiConnectors: {
          loading: false,
          reloadConnectors: noop,
          selectConnector: noop,
        } as AIFeatures['genAiConnectors'],
      }}
    />
  );
};

export const EnabledLoading: StoryFn<{}> = () => {
  return (
    <ConnectorListButtonBase
      buttonProps={{
        iconType: 'sparkles',
        fill: true,
        children: 'Generate',
      }}
      aiFeatures={{
        couldBeEnabled: true,
        enabled: true,
        genAiConnectors: {
          loading: true,
          reloadConnectors: noop,
          selectConnector: noop,
        } as AIFeatures['genAiConnectors'],
      }}
    />
  );
};

const ElasticLLMConnector = {
  actionTypeId: '.inference',
  id: '.elastic',
  isDeprecated: false,
  isPreconfigured: true,
  isSystemAction: false,
  name: 'Elastic LLM',
  referencedByCount: 0,
};

const OpenAIConnector = {
  actionTypeId: '.genai',
  id: '.openai',
  isDeprecated: false,
  isPreconfigured: true,
  isSystemAction: false,
  name: 'OpenAI GPT-5',
  referencedByCount: 0,
};

export const EnabledEmpty: StoryFn<{}> = () => {
  return (
    <ConnectorListButtonBase
      buttonProps={{
        iconType: 'sparkles',
        fill: true,
        children: 'Generate',
      }}
      aiFeatures={{
        couldBeEnabled: true,
        enabled: true,
        genAiConnectors: {
          loading: false,
          connectors: [],
          reloadConnectors: noop,
          selectConnector: noop,
        } as Partial<AIFeatures['genAiConnectors']> as AIFeatures['genAiConnectors'],
      }}
    />
  );
};

export const EnabledSingle: StoryFn<{}> = () => {
  return (
    <ConnectorListButtonBase
      buttonProps={{
        iconType: 'sparkles',
        fill: true,
        children: 'Generate',
      }}
      aiFeatures={{
        couldBeEnabled: true,
        enabled: true,
        genAiConnectors: {
          loading: false,
          connectors: [ElasticLLMConnector],
          reloadConnectors: noop,
          selectConnector: noop,
        } as AIFeatures['genAiConnectors'],
      }}
    />
  );
};

export const EnabledMultiple: StoryFn<{}> = () => {
  return (
    <ConnectorListButtonBase
      buttonProps={{
        iconType: 'sparkles',
        children: 'Generate',
      }}
      aiFeatures={{
        couldBeEnabled: true,
        enabled: true,
        genAiConnectors: {
          loading: false,
          connectors: [ElasticLLMConnector, OpenAIConnector],
          reloadConnectors: noop,
          selectConnector: noop,
        } as AIFeatures['genAiConnectors'],
      }}
    />
  );
};
