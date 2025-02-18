/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import { screen, waitFor } from '@testing-library/react';
import { LENS_ATTACHMENT_TYPE } from '../../../common';
import type { PersistableStateAttachmentViewProps } from '../../client/attachment_framework/types';
import { AttachmentActionType } from '../../client/attachment_framework/types';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import { basicCase } from '../../containers/mock';
import { getVisualizationAttachmentType } from './attachment';

describe('getVisualizationAttachmentType', () => {
  const mockEmbeddableComponent = jest
    .fn()
    .mockReturnValue(<div data-test-subj="embeddableComponent" />);

  let appMockRender: AppMockRenderer;

  const attachmentViewProps: PersistableStateAttachmentViewProps = {
    persistableStateAttachmentTypeId: LENS_ATTACHMENT_TYPE,
    persistableStateAttachmentState: {
      attributes: { state: { query: {} } },
      timeRange: {},
    },
    attachmentId: 'test',
    caseData: { title: basicCase.title, id: basicCase.id },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
    appMockRender.coreStart.lens.EmbeddableComponent = mockEmbeddableComponent;
  });

  it('create the attachment type correctly', () => {
    const lensType = getVisualizationAttachmentType();

    expect(lensType).toStrictEqual({
      id: LENS_ATTACHMENT_TYPE,
      icon: 'document',
      displayName: 'Visualizations',
      getAttachmentViewObject: expect.any(Function),
      getAttachmentRemovalObject: expect.any(Function),
    });
  });

  describe('getAttachmentViewObject', () => {
    it('renders the event correctly', () => {
      const lensType = getVisualizationAttachmentType();
      const event = lensType.getAttachmentViewObject(attachmentViewProps).event;

      expect(event).toBe('added visualization');
    });

    it('renders the timelineAvatar correctly', () => {
      const lensType = getVisualizationAttachmentType();
      const avatar = lensType.getAttachmentViewObject(attachmentViewProps).timelineAvatar;

      expect(avatar).toBe('lensApp');
    });

    it('does not hide the default actions', () => {
      const lensType = getVisualizationAttachmentType();
      const hideDefaultActions =
        lensType.getAttachmentViewObject(attachmentViewProps).hideDefaultActions;

      expect(hideDefaultActions).toBe(false);
    });

    it('set the custom actions correctly', () => {
      const lensType = getVisualizationAttachmentType();
      const actions = lensType
        .getAttachmentViewObject(attachmentViewProps)
        .getActions?.(attachmentViewProps)!;

      expect(actions.length).toBe(1);

      expect(actions[0]).toEqual({
        type: AttachmentActionType.CUSTOM,
        isPrimary: false,
        render: expect.any(Function),
      });
    });

    it('renders the open visualization button correctly', () => {
      appMockRender.coreStart.lens.canUseEditor = () => true;

      const lensType = getVisualizationAttachmentType();
      const actions = lensType
        .getAttachmentViewObject(attachmentViewProps)
        .getActions?.(attachmentViewProps)!;

      const openLensButton = actions[0];

      // @ts-expect-error: render exists on CustomAttachmentAction
      appMockRender.render(openLensButton.render());

      expect(screen.getByTestId('cases-open-in-visualization-btn')).toBeInTheDocument();
    });

    it('renders the children correctly', async () => {
      const lensType = getVisualizationAttachmentType();
      const Component = lensType.getAttachmentViewObject(attachmentViewProps).children!;

      appMockRender.render(
        <Suspense fallback={'Loading...'}>
          <Component {...attachmentViewProps} />
        </Suspense>
      );

      await waitFor(() => {
        expect(screen.getByTestId('embeddableComponent'));
      });
    });
  });

  describe('getAttachmentRemovalObject', () => {
    it('renders the removal event correctly', () => {
      const lensType = getVisualizationAttachmentType();
      const event = lensType.getAttachmentRemovalObject?.(attachmentViewProps);

      expect(event).toEqual({ event: 'removed visualization' });
    });
  });
});
