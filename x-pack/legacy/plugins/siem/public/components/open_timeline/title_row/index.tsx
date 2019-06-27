/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { OpenTimelineProps } from '../types';

import * as i18n from '../translations';

const ButtonFlexItem = styled(EuiFlexItem)`
  margin-left: 5px;
`;

const TitleRowFlexGroup = styled(EuiFlexGroup)`
  user-select: none;
`;

type Props = Pick<OpenTimelineProps, 'onAddTimelinesToFavorites' | 'onDeleteSelected' | 'title'> & {
  /** The number of timelines currently selected */
  selectedTimelinesCount: number;
};

/**
 * Renders the row containing the tile (e.g. Open Timelines / All timelines)
 * and action buttons (i.e. Favorite Selected and Delete Selected)
 */
export const TitleRow = pure<Props>(
  ({ onAddTimelinesToFavorites, onDeleteSelected, selectedTimelinesCount, title }) => (
    <TitleRowFlexGroup
      alignItems="flexStart"
      direction="row"
      gutterSize="none"
      justifyContent="spaceBetween"
    >
      <EuiFlexItem grow={true}>
        <EuiTitle data-test-subj="title" size="m">
          <h2>{title}</h2>
        </EuiTitle>
      </EuiFlexItem>

      {onAddTimelinesToFavorites && (
        <ButtonFlexItem grow={false}>
          <EuiButton
            data-test-subj="favorite-selected"
            iconSide="left"
            iconType="starEmptySpace"
            isDisabled={selectedTimelinesCount === 0}
            onClick={onAddTimelinesToFavorites}
          >
            {i18n.FAVORITE_SELECTED}
          </EuiButton>
        </ButtonFlexItem>
      )}

      {onDeleteSelected && (
        <ButtonFlexItem grow={false}>
          <EuiButton
            data-test-subj="delete-selected"
            iconSide="left"
            iconType="trash"
            isDisabled={selectedTimelinesCount === 0}
            onClick={onDeleteSelected}
          >
            {i18n.DELETE_SELECTED}
          </EuiButton>
        </ButtonFlexItem>
      )}
    </TitleRowFlexGroup>
  )
);
