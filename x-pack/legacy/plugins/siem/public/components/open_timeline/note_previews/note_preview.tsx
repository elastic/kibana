/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiAvatar, EuiFlexGroup, EuiFlexItem, EuiText, EuiTitle, EuiToolTip } from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n/react';
import * as React from 'react';
import styled from 'styled-components';

import { getEmptyValue, defaultToEmptyTag } from '../../empty_value';
import { FormattedDate } from '../../formatted_date';
import { Markdown } from '../../markdown';
import * as i18n from '../translations';
import { TimelineResultNote } from '../types';

const NotePreviewGroup = styled.article`
  & + & {
    margin-top: ${props => props.theme.eui.euiSizeL};
  }
`;

NotePreviewGroup.displayName = 'NotePreviewGroup';

const NotePreviewHeader = styled.header`
  margin-bottom: ${props => props.theme.eui.euiSizeS};
`;

NotePreviewHeader.displayName = 'NotePreviewHeader';

/**
 * Renders a preview of a note in the All / Open Timelines table
 */
export const NotePreview = React.memo<Pick<TimelineResultNote, 'note' | 'updated' | 'updatedBy'>>(
  ({ note, updated, updatedBy }) => (
    <NotePreviewGroup>
      <EuiFlexGroup gutterSize="m" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiAvatar data-test-subj="avatar" name={updatedBy != null ? updatedBy : '?'} size="l" />
        </EuiFlexItem>

        <EuiFlexItem>
          <NotePreviewHeader>
            <EuiTitle data-test-subj="updated-by" size="xxs">
              <h6>{defaultToEmptyTag(updatedBy)}</h6>
            </EuiTitle>

            <EuiText color="subdued" data-test-subj="posted" size="xs">
              <p>
                {i18n.POSTED}{' '}
                {updated != null ? (
                  <EuiToolTip content={<FormattedDate fieldName="" value={updated} />}>
                    <FormattedRelative data-test-subj="updated" value={new Date(updated)} />
                  </EuiToolTip>
                ) : (
                  getEmptyValue()
                )}
              </p>
            </EuiText>
          </NotePreviewHeader>

          <Markdown raw={note || ''} size="s" />
        </EuiFlexItem>
      </EuiFlexGroup>
    </NotePreviewGroup>
  )
);

NotePreview.displayName = 'NotePreview';
