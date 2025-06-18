/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import { screen, waitFor } from '@testing-library/react';
import { PAGE_ATTACHMENT_TYPE } from '../../../../common/constants/links';
import type { PersistableStateAttachmentViewProps } from '../../../client/attachment_framework/types';
import { getPageAttachmentType } from './attachment';
import { renderWithTestingProviders } from '../../../common/mock';
import type { PageAttachmentPersistedState } from './types';

describe('getPageAttachmentType', () => {
  const attachmentViewProps: PersistableStateAttachmentViewProps<PageAttachmentPersistedState> = {
    persistableStateAttachmentTypeId: PAGE_ATTACHMENT_TYPE,
    persistableStateAttachmentState: {
      pathname: '/test/path',
      type: PAGE_ATTACHMENT_TYPE,
      url: {
        pathAndQuery: '/test/path?query=1',
        iconType: 'link',
        actionLabel: 'View in Dashboards',
        label: 'Test Link',
      },
      snapshot: {
        imgData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA...',
      },
      renderComponentId: 'PageAttachmentChildren',
      screenContext: null,
    },
    attachmentId: 'test',
    caseData: { title: 'Test Case', id: 'case-id' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates the attachment type correctly', () => {
    const linkType = getPageAttachmentType();

    expect(linkType).toStrictEqual({
      id: PAGE_ATTACHMENT_TYPE,
      icon: 'link',
      displayName: 'Page',
      getAttachmentViewObject: expect.any(Function),
      getAttachmentRemovalObject: expect.any(Function),
    });
  });

  describe('getAttachmentViewObject', () => {
    it('renders the event correctly', () => {
      const linkType = getPageAttachmentType();
      const event = linkType.getAttachmentViewObject(attachmentViewProps).event;

      expect(event).toBe('added a page');
    });

    it('renders the timelineAvatar correctly', () => {
      const linkType = getPageAttachmentType();
      const avatar = linkType.getAttachmentViewObject(attachmentViewProps).timelineAvatar;

      expect(avatar).toBe('link');
    });

    it('does not hide the default actions', () => {
      const linkType = getPageAttachmentType();
      const hideDefaultActions =
        linkType.getAttachmentViewObject(attachmentViewProps).hideDefaultActions;

      expect(hideDefaultActions).toBe(false);
    });

    it('renders the children correctly', async () => {
      const linkType = getPageAttachmentType();
      const Component = linkType.getAttachmentViewObject(
        attachmentViewProps
        // eslint-disable-next-line testing-library/no-node-access
      ).children!;

      renderWithTestingProviders(
        <Suspense fallback={'Loading...'}>
          <Component {...attachmentViewProps} />
        </Suspense>
      );

      await waitFor(() => {
        expect(screen.getByText('Loading...')).toBeInTheDocument();
      });
    });
  });

  describe('getAttachmentRemovalObject', () => {
    it('renders the removal event correctly', () => {
      const linkType = getPageAttachmentType();
      const event = linkType.getAttachmentRemovalObject?.(attachmentViewProps);

      expect(event).toEqual({ event: 'removed page' });
    });
  });
});
