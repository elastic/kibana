/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { storiesOf } from '@storybook/react';
import React from 'react';
import { TagList } from '../tag_list';
import { TagSpec } from '../../../lib/tag';

const mockTagRegistry: { [tag: string]: TagSpec } = {
  tag1: {
    name: 'tag1',
    color: '#cc3b54',
  },
  tag2: {
    name: 'tag2',
    color: '#5bc149',
  },
  tag3: {
    name: 'tag3',
    color: '#fbc545',
  },
  tag4: {
    name: 'tag4',
    color: '#9b3067',
  },
  tag5: {
    name: 'tag5',
    color: '#1819bd',
  },
  tag6: {
    name: 'tag6',
    color: '#d41e93',
  },
  tag7: {
    name: 'tag7',
    color: '#3486d2',
  },
  tag8: {
    name: 'tag8',
    color: '#b870d8',
  },
  tag9: {
    name: 'tag9',
    color: '#f4a4a7',
  },
  tag10: {
    name: 'tag10',
    color: '#072d6d',
  },
};

const getTag = (name: string): TagSpec => mockTagRegistry[name] || { name, color: '#666666' };

storiesOf('components/Tags/TagList', module)
  .add('empty list', () => <TagList getTag={getTag} />)
  .add('with health tags', () => <TagList tags={['tag1', 'tag4', 'tag6']} getTag={getTag} />)
  .add('with badge tags', () => (
    <TagList tags={['tag1', 'tag2', 'tag3']} getTag={getTag} tagType="badge" />
  ))
  .add('with lots of tags', () => (
    <TagList
      tags={['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6', 'tag7', 'tag8', 'tag9', 'tag10']}
      getTag={getTag}
      tagType="badge"
    />
  ));
