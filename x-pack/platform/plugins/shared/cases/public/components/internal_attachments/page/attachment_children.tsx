/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiImage,
  EuiSpacer,
  EuiLink,
  EuiCallOut,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
} from '@elastic/eui';
import type { PageAttachmentPersistedState } from './types';

interface AttachmentChildrenProps {
  persistableStateAttachmentState: PageAttachmentPersistedState;
}

export const PageAttachmentChildren: React.FC<AttachmentChildrenProps> = ({
  persistableStateAttachmentState,
}) => {
  const { url, snapshot } = persistableStateAttachmentState;
  if (!url) {
    return (
      <EuiCallOut
        title={i18n.translate('xpack.cases.caseView.pageAttachment.noUrlProvidedTitle', {
          defaultMessage: 'No URL provided',
        })}
        color="danger"
        iconType="alert"
      >
        <EuiText>
          <p>
            {i18n.translate('xpack.cases.caseView.pageAttachment.noUrlProvided', {
              defaultMessage: 'This page attachment does not contain a valid URL.',
            })}
          </p>
        </EuiText>
      </EuiCallOut>
    );
  }
  const href = url.pathAndQuery || '';
  const label = url.label;
  return (
    <>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiIcon type={persistableStateAttachmentState.url.iconType} size="m" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiLink href={href}>
            <EuiText size="m">{label}</EuiText>
          </EuiLink>
        </EuiFlexItem>
      </EuiFlexGroup>
      {snapshot?.imgData && (
        <>
          <EuiSpacer size="m" />
          <EuiImage key="screenshot" src={snapshot.imgData} alt="screenshot" allowFullScreen />
        </>
      )}
    </>
  );
};

PageAttachmentChildren.displayName = 'PageAttachmentChildren';

// Note: This is for lazy loading
// eslint-disable-next-line import/no-default-export
export default PageAttachmentChildren;
