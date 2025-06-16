/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { PAGE_ATTACHMENT_TYPE } from '../../../../common/constants/links';
import * as i18n from './translations';

import type {
  PersistableStateAttachmentType,
  PersistableStateAttachmentViewProps,
  AttachmentViewObject,
} from '../../../client/attachment_framework/types';
import type { PageAttachmentPersistedState } from './types';

const AttachmentChildrenLazy = React.lazy(() => import('./attachment_children'));

const getLinkAttachmentViewObject = (): AttachmentViewObject<
  PersistableStateAttachmentViewProps<PageAttachmentPersistedState>
> => {
  return {
    event: i18n.ADDED_PAGE,
    timelineAvatar: 'link',
    hideDefaultActions: false,
    children: AttachmentChildrenLazy,
  };
};

export const getPageAttachmentType =
  (): PersistableStateAttachmentType<PageAttachmentPersistedState> => ({
    id: PAGE_ATTACHMENT_TYPE,
    icon: 'link',
    displayName: i18n.PAGE_LABEL,
    getAttachmentViewObject: getLinkAttachmentViewObject,
    getAttachmentRemovalObject: () => ({ event: i18n.REMOVED_PAGE }),
  });
