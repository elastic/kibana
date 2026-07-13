/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiLink, EuiText, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { DuplicateTagGroup } from '../utils';

export interface DuplicateTagsCalloutProps {
  groups: DuplicateTagGroup[];
  onMergeGroup: (group: DuplicateTagGroup) => void;
}

export const DuplicateTagsCallout: FC<DuplicateTagsCalloutProps> = ({ groups, onMergeGroup }) => {
  if (groups.length === 0) {
    return null;
  }

  return (
    <>
      <EuiCallOut
        data-test-subj="tagsDuplicateTagsCallout"
        title={i18n.translate('xpack.savedObjectsTagging.management.duplicates.calloutTitle', {
          defaultMessage:
            '{count, plural, one {1 duplicate tag name found} other {# duplicate tag names found}}',
          values: { count: groups.length },
        })}
        color="warning"
        iconType="alert"
      >
        <EuiFlexGroup direction="column" gutterSize="s">
          {groups.map((group) => (
            <EuiFlexItem key={group.normalizedName}>
              <EuiText size="s">
                <FormattedMessage
                  id="xpack.savedObjectsTagging.management.duplicates.groupText"
                  defaultMessage='{count} tags named "{name}"'
                  values={{ count: group.tags.length, name: group.tags[0].name }}
                />{' '}
                <EuiLink
                  data-test-subj={`tagsDuplicateTagsMergeLink-${group.normalizedName}`}
                  onClick={() => onMergeGroup(group)}
                >
                  <FormattedMessage
                    id="xpack.savedObjectsTagging.management.duplicates.mergeLink"
                    defaultMessage="Merge"
                  />
                </EuiLink>
              </EuiText>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiCallOut>
      <EuiSpacer size="l" />
    </>
  );
};
