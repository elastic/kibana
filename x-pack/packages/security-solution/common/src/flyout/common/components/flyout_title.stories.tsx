/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Story } from '@storybook/react';
import { EuiLink } from '@elastic/eui';
import styled from '@emotion/styled';
import { FlyoutTitle } from './flyout_title';

const FixWidthWrapper = styled.div`
  width: 350px;
`;

const FixWidthLinkWrapper = styled(EuiLink)`
  width: 350px;
`;

export default {
  component: FlyoutTitle,
  title: 'Flyout/Title',
};

export const Default: Story<void> = () => {
  return (
    <FixWidthWrapper>
      <FlyoutTitle title={'Title'} iconType={'warning'} data-test-subj={'test-title'} />
    </FixWidthWrapper>
  );
};

export const WithoutIcon: Story<void> = () => {
  return (
    <FixWidthWrapper>
      <FlyoutTitle title={'Title'} data-test-subj={'test-title'} />
    </FixWidthWrapper>
  );
};

export const MultipleLines: Story<void> = () => {
  return (
    <FixWidthWrapper>
      <FlyoutTitle
        title={'Very long title should wrap to multiple lines'}
        iconType={'discuss'}
        data-test-subj={'test-title'}
      />
    </FixWidthWrapper>
  );
};

export const MoreThanThreeLines: Story<void> = () => {
  return (
    <FixWidthWrapper>
      <FlyoutTitle
        title={
          'Title longer than three lines should be clamped with eclipses and capped at three lines. blah blah blah'
        }
        iconType={'document'}
        data-test-subj={'test-title'}
      />
    </FixWidthWrapper>
  );
};

export const TitleInLink: Story<void> = () => {
  return (
    <FixWidthLinkWrapper>
      <FlyoutTitle title={'Title'} iconType={'warning'} data-test-subj={'test-title'} isLink />
    </FixWidthLinkWrapper>
  );
};

export const MultipleLinesInLink: Story<void> = () => {
  return (
    <FixWidthLinkWrapper>
      <FlyoutTitle
        title={'Very long title should wrap to multiple lines'}
        iconType={'discuss'}
        data-test-subj={'test-title'}
        isLink
      />
    </FixWidthLinkWrapper>
  );
};

export const MoreThanThreeLinesInLink: Story<void> = () => {
  return (
    <FixWidthLinkWrapper>
      <FlyoutTitle
        title={
          'Title longer than three lines should be clamped with eclipses and capped at three lines. blah blah blah'
        }
        iconType={'document'}
        data-test-subj={'test-title'}
        isLink
      />
    </FixWidthLinkWrapper>
  );
};
