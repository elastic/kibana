/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';

import * as i18n from '../translations';
import { OpenTimelineProps } from '../types';
import { HeaderSection } from '../../header_section';

type Props = Pick<OpenTimelineProps, 'onAddTimelinesToFavorites' | 'onDeleteSelected' | 'title'> & {
  /** The number of timelines currently selected */
  selectedTimelinesCount: number;
};

/**
 * Renders the row containing the tile (e.g. Open Timelines / All timelines)
 * and action buttons (i.e. Favorite Selected and Delete Selected)
 */
export const TitleRow = React.memo<Props>(
  ({ onAddTimelinesToFavorites, onDeleteSelected, selectedTimelinesCount, title }) => (
    <HeaderSection title={title}>
      {(onAddTimelinesToFavorites || onDeleteSelected) && (
        <EuiFlexGroup gutterSize="s" responsive={false}>
          {onAddTimelinesToFavorites && (
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="favorite-selected"
                iconSide="left"
                iconType="starEmptySpace"
                isDisabled={selectedTimelinesCount === 0}
                onClick={onAddTimelinesToFavorites}
              >
                {i18n.FAVORITE_SELECTED}
              </EuiButton>
            </EuiFlexItem>
          )}

          {onDeleteSelected && (
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="delete-selected"
                iconSide="left"
                iconType="trash"
                isDisabled={selectedTimelinesCount === 0}
                onClick={onDeleteSelected}
              >
                {i18n.DELETE_SELECTED}
              </EuiButton>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      )}
    </HeaderSection>
  )
);

TitleRow.displayName = 'TitleRow';
