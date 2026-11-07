/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiAvatar, EuiFlexGroup, EuiFlexItem, EuiText, EuiTextColor } from '@elastic/eui';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import type { AttachmentUIV2 } from '../../../../common/ui/types';
import { getExternalSyncCommentMetadata } from '../../../../common/utils/external_sync_comments';
import { HoverableUserWithAvatarResolver } from '../../user_profiles/hoverable_user_with_avatar_resolver';
import * as i18n from './translations';

interface Props {
  attachment: AttachmentUIV2;
  userProfiles?: Map<string, UserProfileWithAvatar>;
}

/**
 * The Kibana user who created the attachment, or, for a comment imported from an external
 * incident, the external author named "via" the connector it came from.
 */
const AttachmentAuthorComponent: React.FC<Props> = ({ attachment, userProfiles }) => {
  const external = getExternalSyncCommentMetadata(attachment);

  if (external == null) {
    return (
      <HoverableUserWithAvatarResolver user={attachment.createdBy} userProfiles={userProfiles} />
    );
  }

  const name = external.actor?.name ?? external.connectorName;

  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="s"
      responsive={false}
      data-test-subj="attachment-external-author"
    >
      <EuiFlexItem grow={false}>
        <EuiAvatar size="s" name={name} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s">
          <strong>{name}</strong>{' '}
          <EuiTextColor color="subdued">{i18n.VIA_CONNECTOR(external.connectorName)}</EuiTextColor>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

AttachmentAuthorComponent.displayName = 'AttachmentAuthor';

export const AttachmentAuthor = React.memo(AttachmentAuthorComponent);
