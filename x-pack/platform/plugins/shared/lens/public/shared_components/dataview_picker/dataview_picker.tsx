/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { calculateWidthFromEntries } from '@kbn/calculate-width-from-char-count';
import React, { useState } from 'react';
import { EuiPopover, EuiPopoverTitle, EuiSelectableProps } from '@elastic/eui';
import { DataViewsList } from '@kbn/unified-search-plugin/public';
import { css } from '@emotion/react';
import { type IndexPatternRef } from '../../types';
import { type ChangeIndexPatternTriggerProps, TriggerButton } from './trigger';

const MAX_WIDTH = 600;
const MIN_WIDTH = 320;

export function ChangeIndexPattern({
  indexPatternRefs,
  isMissingCurrent,
  indexPatternId,
  onChangeIndexPattern,
  trigger,
  selectableProps,
}: {
  trigger: ChangeIndexPatternTriggerProps;
  indexPatternRefs: IndexPatternRef[];
  isMissingCurrent?: boolean;
  onChangeIndexPattern: (newId: string) => void;
  indexPatternId?: string;
  selectableProps?: EuiSelectableProps;
}) {
  const [isPopoverOpen, setPopoverIsOpen] = useState(false);

  return (
    <EuiPopover
      button={
        <TriggerButton
          {...trigger}
          isMissingCurrent={isMissingCurrent}
          togglePopover={() => setPopoverIsOpen(!isPopoverOpen)}
        />
      }
      panelProps={{
        ['data-test-subj']: 'lnsChangeIndexPatternPopover',
      }}
      repositionOnScroll
      isOpen={isPopoverOpen}
      closePopover={() => setPopoverIsOpen(false)}
      display="block"
      panelPaddingSize="none"
      ownFocus
    >
      <div
        css={css`
          width: ${calculateWidthFromEntries(indexPatternRefs, ['name', 'id'], {
            minWidth: MIN_WIDTH,
            maxWidth: MAX_WIDTH,
          })}px;
        `}
      >
        <EuiPopoverTitle paddingSize="s">
          {i18n.translate('xpack.lens.indexPattern.changeDataViewTitle', {
            defaultMessage: 'Data view',
          })}
        </EuiPopoverTitle>

        <DataViewsList
          dataViewsList={indexPatternRefs}
          onChangeDataView={(newId) => {
            onChangeIndexPattern(newId);
            setPopoverIsOpen(false);
          }}
          currentDataViewId={indexPatternId}
          selectableProps={selectableProps}
        />
      </div>
    </EuiPopover>
  );
}
