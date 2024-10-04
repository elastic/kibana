/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { StoryFn } from '@storybook/react';
import { EuiIcon } from '@elastic/eui';
import { ExpandablePanel } from './expandable_panel';

export default {
  component: ExpandablePanel,
  title: 'Flyout/ExpandablePanel',
};

const defaultProps = {
  header: {
    title: 'title',
    iconType: 'storage',
  },
};
const headerContent = <EuiIcon type="expand" />;

const children = <p>{'test content'}</p>;

export const Default: StoryFn<void> = () => {
  return <ExpandablePanel {...defaultProps}>{children}</ExpandablePanel>;
};

export const DefaultWithoutIcon: StoryFn<void> = () => {
  const props = { header: { title: 'title' } };
  return <ExpandablePanel {...props}>{children}</ExpandablePanel>;
};

export const DefaultWithHeaderContent: StoryFn<void> = () => {
  const props = {
    ...defaultProps,
    header: { ...defaultProps.header, headerContent },
  };
  return <ExpandablePanel {...props}>{children}</ExpandablePanel>;
};

export const Expandable: StoryFn<void> = () => {
  const props = {
    ...defaultProps,
    expand: { expandable: true },
  };
  return <ExpandablePanel {...props}>{children}</ExpandablePanel>;
};

export const ExpandableDefaultOpen: StoryFn<void> = () => {
  const props = {
    ...defaultProps,
    expand: { expandable: true, expandedOnFirstRender: true },
  };
  return <ExpandablePanel {...props}>{children}</ExpandablePanel>;
};

export const EmptyDefault: StoryFn<void> = () => {
  return <ExpandablePanel {...defaultProps} />;
};

export const EmptyDefaultExpanded: StoryFn<void> = () => {
  const props = {
    ...defaultProps,
    expand: { expandable: true },
  };
  return <ExpandablePanel {...props} />;
};
