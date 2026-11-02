/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { SessionMemorySearchHit } from '../../../../common/http_api/session_memory';
import { getImagePreviewSrc } from './media_file';

const imageAlt = i18n.translate('xpack.contextEngine.sessionMemory.result.imageAlt', {
  defaultMessage: 'Image memory preview',
});

/** One search hit: its score, the memory's text, and a preview of its first image. */
export const SessionMemoryResult = ({
  hit: { _score, memory },
}: {
  hit: SessionMemorySearchHit;
}) => {
  const imageSrc = getImagePreviewSrc(memory.media);
  const badges = [memory.type, memory.session_id, memory.user_id, memory.agent_id].filter(
    (value): value is string => Boolean(value)
  );

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj="contextSessionMemoryResult">
      <EuiFlexGroup gutterSize="m" alignItems="flexStart" responsive={false}>
        {imageSrc && (
          <EuiFlexItem grow={false}>
            <EuiImage
              src={imageSrc}
              alt={imageAlt}
              size="s"
              hasShadow
              allowFullScreen
              data-test-subj="contextSessionMemoryResult-image"
            />
          </EuiFlexItem>
        )}
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiBadge color="primary" data-test-subj="contextSessionMemoryResult-score">
                {_score.toFixed(3)}
              </EuiBadge>
            </EuiFlexItem>
            {badges.map((badge) => (
              <EuiFlexItem grow={false} key={badge}>
                <EuiBadge color="hollow">{badge}</EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
          {memory.content && (
            <>
              <EuiSpacer size="s" />
              <EuiText size="s" data-test-subj="contextSessionMemoryResult-content">
                <p>{memory.content}</p>
              </EuiText>
            </>
          )}
          <EuiSpacer size="xs" />
          <EuiText size="xs" color="subdued">
            {memory['@timestamp']}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
