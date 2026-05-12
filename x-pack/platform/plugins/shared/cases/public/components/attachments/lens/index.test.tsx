/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import { screen, waitFor } from '@testing-library/react';
import { LENS_ATTACHMENT_TYPE } from '../../../../common';
import {
  AttachmentActionType,
  type UnifiedHybridAttachmentViewProps,
} from '../../../client/attachment_framework/types';

import { basicCase } from '../../../containers/mock';
import { getLensAttachmentType } from '.';
import { createStartServicesMock } from '../../../common/lib/kibana/kibana_react.mock';
import { renderWithTestingProviders } from '../../../common/mock';

describe('getLensAttachmentType', () => {
  const mockEmbeddableComponent = jest
    .fn()
    .mockReturnValue(<div data-test-subj="embeddableComponent" />);

  const attachmentViewProps: UnifiedHybridAttachmentViewProps = {
    data: {
      state: {
        attributes: { state: { query: {} } },
        timeRange: {},
      },
    },
    createdBy: { username: 'elastic', fullName: null, email: null, profileUid: undefined },
    version: '1',
    savedObjectId: 'test',
    caseData: { title: basicCase.title, id: basicCase.id },
    rowContext: {
      appId: 'cases',
      manageMarkdownEditIds: [],
      selectedOutlineCommentId: '',
      loadingCommentIds: [],
      euiTheme: {} as never,
    },
  };

  const soRefViewProps: UnifiedHybridAttachmentViewProps = {
    attachmentId: 'lens-so-id',
    metadata: {
      title: 'Saved viz',
      soType: 'lens',
      config: {
        title: 'Saved viz',
        visualizationType: 'lnsXY',
        state: {},
        references: [],
      },
    },
    createdBy: { username: 'elastic', fullName: null, email: null, profileUid: undefined },
    version: '1',
    savedObjectId: 'test',
    caseData: { title: basicCase.title, id: basicCase.id },
    rowContext: {
      appId: 'cases',
      manageMarkdownEditIds: [],
      selectedOutlineCommentId: '',
      loadingCommentIds: [],
      euiTheme: {} as never,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('create the attachment type correctly', () => {
    const lensType = getLensAttachmentType();

    expect(lensType).toStrictEqual({
      id: LENS_ATTACHMENT_TYPE,
      icon: 'document',
      displayName: 'Lens',
      getAttachmentViewObject: expect.any(Function),
      getAttachmentRemovalObject: expect.any(Function),
      schema: expect.any(Object),
    });
  });

  describe('getAttachmentViewObject', () => {
    it('renders the event correctly', () => {
      const lensType = getLensAttachmentType();
      const event = lensType.getAttachmentViewObject(attachmentViewProps).event;

      expect(event).toBe('added Lens visualization');
    });

    it('renders the timelineAvatar correctly', () => {
      const lensType = getLensAttachmentType();
      const avatar = lensType.getAttachmentViewObject(attachmentViewProps).timelineAvatar;

      expect(avatar).toBe('lensApp');
    });

    it('does not hide the default actions', () => {
      const lensType = getLensAttachmentType();
      const hideDefaultActions =
        lensType.getAttachmentViewObject(attachmentViewProps).hideDefaultActions;

      expect(hideDefaultActions).toBe(false);
    });

    it('set the custom actions correctly', () => {
      const lensType = getLensAttachmentType();
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
      const lensType = getLensAttachmentType();
      const actions = lensType
        .getAttachmentViewObject(attachmentViewProps)
        .getActions?.(attachmentViewProps)!;

      const openLensButton = actions[0];

      const services = createStartServicesMock();
      services.lens.EmbeddableComponent = mockEmbeddableComponent;
      services.lens.canUseEditor = () => true;
      // @ts-expect-error: render exists on CustomAttachmentAction
      renderWithTestingProviders(openLensButton.render(), { wrapperProps: { services } });

      expect(screen.getByTestId('cases-open-in-lens-btn')).toBeInTheDocument();
    });

    it('renders the children correctly', async () => {
      const lensType = getLensAttachmentType();
      // eslint-disable-next-line testing-library/no-node-access
      const Component = lensType.getAttachmentViewObject(attachmentViewProps).children!;

      const services = createStartServicesMock();
      services.lens.EmbeddableComponent = mockEmbeddableComponent;

      renderWithTestingProviders(
        <Suspense fallback={'Loading...'}>
          <Component {...attachmentViewProps} />
        </Suspense>,
        { wrapperProps: { services } }
      );

      await waitFor(() => {
        expect(screen.getByTestId('embeddableComponent'));
      });
    });

    describe('SO-ref arm (`attachmentId` + `metadata.config`)', () => {
      it('renders the same event header as the persistable arm', () => {
        const lensType = getLensAttachmentType();
        const event = lensType.getAttachmentViewObject(soRefViewProps).event;

        expect(event).toBe('added Lens visualization');
      });

      it('exposes an open-in-lens action when a snapshot is present', () => {
        const lensType = getLensAttachmentType();
        const actions = lensType
          .getAttachmentViewObject(soRefViewProps)
          .getActions?.(soRefViewProps);

        expect(actions?.length).toBe(1);
      });

      it('omits the open-in-lens action when no snapshot is available', () => {
        const lensType = getLensAttachmentType();
        const noSnapshotProps: UnifiedHybridAttachmentViewProps = {
          ...soRefViewProps,
          metadata: { title: 'Saved viz', soType: 'lens' },
        };
        const actions = lensType
          .getAttachmentViewObject(noSnapshotProps)
          .getActions?.(noSnapshotProps);

        expect(actions?.length).toBe(0);
      });

      it('renders the SO-ref children via the live-fetch + snapshot fallback embed', async () => {
        const lensType = getLensAttachmentType();
        // eslint-disable-next-line testing-library/no-node-access
        const Component = lensType.getAttachmentViewObject(soRefViewProps).children!;

        const services = createStartServicesMock();
        services.lens.EmbeddableComponent = mockEmbeddableComponent;
        // The shared services mock omits contentManagement; inject a minimal
        // client whose `get` resolves with the live SO so the renderer takes
        // the live-fetch path before any snapshot fallback.
        (
          services as unknown as { contentManagement: { client: { get: jest.Mock } } }
        ).contentManagement = {
          client: {
            get: jest.fn().mockResolvedValue({
              item: {
                attributes: { title: 'Saved viz', visualizationType: 'lnsXY', state: {} },
                references: [],
              },
            }),
          },
        };

        renderWithTestingProviders(
          <Suspense fallback={'Loading...'}>
            <Component {...soRefViewProps} />
          </Suspense>,
          { wrapperProps: { services } }
        );

        await waitFor(() => {
          expect(screen.getByTestId('embeddableComponent')).toBeInTheDocument();
        });
      });
    });
  });

  describe('getAttachmentRemovalObject', () => {
    it('renders the removal event correctly', () => {
      const lensType = getLensAttachmentType();
      const event = lensType.getAttachmentRemovalObject?.(attachmentViewProps);

      expect(event).toEqual({ event: 'removed Lens visualization' });
    });
  });
});
