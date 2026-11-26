/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { RuleCreateSearch } from './rule_create_search';
import type {
  RuleCreateSearchItem,
  RuleCreateSearchSectionId,
  RuleCreateSearchSectionResult,
  RuleCreateSearchSections,
} from './types';

type SectionState = 'results' | 'loading' | 'error' | 'missing';

interface RuleCreateSearchStoryProps {
  universal: SectionState;
  templates: SectionState;
  classic: SectionState;
  canSendToAgent: boolean;
}

const createItem = (
  id: string,
  title: string,
  description: string,
  iconType?: string
): RuleCreateSearchItem => ({
  id,
  title,
  description,
  iconType,
  onSelect: action(`select ${id}`),
});

const CATALOG: Readonly<Record<RuleCreateSearchSectionId, readonly RuleCreateSearchItem[]>> = {
  universal: [
    createItem(
      'threshold',
      'Monitor a threshold',
      'Guided builder for counts and metric thresholds',
      'puzzlePiece'
    ),
    createItem(
      'sequence',
      'Build a sequence',
      'Guided builder for an ordered sequence of events',
      'puzzlePiece'
    ),
    createItem('esql', 'Write ES|QL query', 'Write your own ES|QL query', 'code'),
  ],
  'universal.templates': [
    createItem(
      'high-cpu',
      'High CPU utilization',
      'Alert when host or container CPU stays above a threshold.'
    ),
    createItem(
      'error-rate',
      'High error rate',
      'Alert when the share of error logs exceeds a threshold.'
    ),
  ],
  classic: [
    createItem(
      'custom-threshold',
      'Custom threshold',
      'Alert when any Observability data type reaches or exceeds a given value.'
    ),
    createItem(
      'degraded-docs',
      'Degraded docs',
      'Alert when degraded docs percentage exceeds a threshold.'
    ),
    createItem(
      'es-query',
      'Elasticsearch query',
      'Alert when matches are found during the latest query run.'
    ),
  ],
};

const matches = (item: RuleCreateSearchItem, query: string) =>
  `${item.title} ${item.description ?? ''}`.toLowerCase().includes(query.toLowerCase());

const getSection = (
  sectionId: RuleCreateSearchSectionId,
  state: SectionState,
  query: string
): RuleCreateSearchSectionResult | undefined => {
  switch (state) {
    case 'missing':
      return undefined;
    case 'loading':
      return { items: [], isLoading: true };
    case 'error':
      return { items: [], isLoading: false, error: new Error('Request failed') };
    case 'results':
      return {
        items: CATALOG[sectionId].filter((item) => matches(item, query)),
        isLoading: false,
        headerAction:
          sectionId === 'classic'
            ? { label: 'Browse all', onClick: action('browse all classic') }
            : undefined,
      };
  }
};

const RuleCreateSearchStory = ({
  universal,
  templates,
  classic,
  canSendToAgent,
}: RuleCreateSearchStoryProps) => {
  const [query, setQuery] = useState('');

  const sections: RuleCreateSearchSections = {
    universal: getSection('universal', universal, query),
    'universal.templates': getSection('universal.templates', templates, query),
    classic: getSection('classic', classic, query),
  };

  return (
    <div style={{ maxWidth: 600 }}>
      <RuleCreateSearch
        sections={sections}
        onQueryChange={setQuery}
        onSendToAgent={canSendToAgent ? action('send to agent') : undefined}
      />
    </div>
  );
};

const SECTION_STATES: SectionState[] = ['results', 'loading', 'error', 'missing'];

const meta: Meta<typeof RuleCreateSearchStory> = {
  title: 'Alerting V2/Create Rule/Search',
  component: RuleCreateSearchStory,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Type in the input (e.g. "threshold") to open the dropdown.',
      },
    },
  },
  argTypes: {
    universal: { control: 'radio', options: SECTION_STATES },
    templates: { control: 'radio', options: SECTION_STATES },
    classic: { control: 'radio', options: SECTION_STATES },
  },
  args: {
    universal: 'results',
    templates: 'results',
    classic: 'results',
    canSendToAgent: true,
  },
};

export default meta;

type Story = StoryObj<typeof RuleCreateSearchStory>;

export const Default: Story = {};

export const Loading: Story = {
  args: { templates: 'loading', classic: 'loading' },
};

export const FailingSection: Story = {
  args: { templates: 'error' },
};

export const NoResults: Story = {
  args: { universal: 'missing', templates: 'missing', classic: 'missing' },
};

export const WithoutAgentPrivilege: Story = {
  args: { canSendToAgent: false },
};
