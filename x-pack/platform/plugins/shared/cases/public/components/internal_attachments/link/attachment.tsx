/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { LINK_ATTACHMENT_TYPE } from '../../../../common/constants/links';
import * as i18n from './translations';

import type {
  PersistableStateAttachmentType,
  PersistableStateAttachmentViewProps,
} from '../../../client/attachment_framework/types';

const AttachmentChildrenLazy = React.lazy(() => import('./attachment_children'));

const getLinkAttachmentViewObject = () => {
  return {
    event: i18n.ADDED_LINK,
    timelineAvatar: 'link',
    hideDefaultActions: false,
    children: AttachmentChildrenLazy as unknown as React.LazyExoticComponent<
      React.FC<PersistableStateAttachmentViewProps>
    >,
  };
};

export const getLinkAttachmentType = (): PersistableStateAttachmentType => ({
  id: LINK_ATTACHMENT_TYPE,
  icon: 'link',
  displayName: 'Links',
  getAttachmentViewObject: getLinkAttachmentViewObject,
  getAttachmentRemovalObject: () => ({ event: i18n.REMOVED_LINK }),
});
