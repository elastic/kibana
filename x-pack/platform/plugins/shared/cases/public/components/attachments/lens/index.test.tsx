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
import { getVisualizationAttachmentType } from '.';
import { createStartServicesMock } from '../../../common/lib/kibana/kibana_react.mock';
import { KibanaServices } from '../../../common/lib/kibana';
import { allCasesPermissions, renderWithTestingProviders } from '../../../common/mock';

describe('getVisualizationAttachmentType', () => {
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
    permissions: allCasesPermissions(),
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
    jest.spyOn(KibanaServices, 'get').mockReturnValue({
      lens: { canUseEditor: () => true },
    } as unknown as ReturnType<typeof KibanaServices.get>);
  });

  it('create the attachment type correctly', () => {
    const lensType = getVisualizationAttachmentType();

    expect(lensType.getIcon(attachmentViewProps)).toBe('lensApp');
    expect(lensType.getLabel()).toBe('Visualizations');
    expect(lensType).toStrictEqual({
      id: LENS_ATTACHMENT_TYPE,
      getIcon: expect.any(Function),
      getLabel: expect.any(Function),
      getCreationActivity: expect.any(Function),
      getRemovalActivity: expect.any(Function),
      getAttachmentList: expect.any(Function),
      schema: expect.any(Object),
      workflowSchema: expect.any(Object),
    });
  });

  describe('workflowSchema', () => {
    const getWorkflowSchema = () => {
      const { workflowSchema } = getVisualizationAttachmentType();
      if (!workflowSchema) {
        throw new Error('expected lens to expose a workflow schema');
      }
      return workflowSchema;
    };

    const referencePayload = {
      type: LENS_ATTACHMENT_TYPE,
      owner: 'securitySolution',
      attachmentId: 'lens-so-id',
      metadata: { title: 'My visualization', soType: 'lens' },
    };

    it('accepts a by-reference payload', () => {
      expect(getWorkflowSchema().safeParse(referencePayload).success).toBe(true);
    });

    it('rejects a by-reference payload carrying an inline data snapshot', () => {
      expect(
        getWorkflowSchema().safeParse({ ...referencePayload, data: { attributes: {} } }).success
      ).toBe(false);
    });

    it('rejects the by-value persistable-state arm', () => {
      expect(
        getWorkflowSchema().safeParse({
          type: LENS_ATTACHMENT_TYPE,
          owner: 'securitySolution',
          data: { state: {} },
        }).success
      ).toBe(false);
    });
  });

  describe('getCreationActivity', () => {
    it('renders the event correctly', () => {
      const lensType = getVisualizationAttachmentType();
      const event = lensType.getCreationActivity(attachmentViewProps).event;

      expect(event).toBe('added visualization');
    });

    it('renders the saved-object event correctly', () => {
      const lensType = getVisualizationAttachmentType();
      const event = lensType.getCreationActivity({
        ...attachmentViewProps,
        attachmentId: 'lens-1',
        metadata: { title: 'My lens', soType: 'lens' },
      }).event;

      const services = createStartServicesMock();
      renderWithTestingProviders(<>{event}</>, { wrapperProps: { services } });

      expect(screen.getByText('added visualization My lens')).toBeInTheDocument();
    });

    it('does not hide the default actions', () => {
      const lensType = getVisualizationAttachmentType();
      const hideDefaultActions =
        lensType.getCreationActivity(attachmentViewProps).hideDefaultActions;

      expect(hideDefaultActions).toBe(false);
    });

    it('set the custom actions correctly', () => {
      const lensType = getVisualizationAttachmentType();
      const actions = lensType
        .getCreationActivity(attachmentViewProps)
        .getActions?.(attachmentViewProps)!;

      expect(actions.length).toBe(1);

      expect(actions[0]).toEqual({
        type: AttachmentActionType.CUSTOM,
        isPrimary: false,
        render: expect.any(Function),
      });
    });

    it('does not set custom actions for a saved-object attachment without inline data', () => {
      const lensType = getVisualizationAttachmentType();
      const creationActivity = lensType.getCreationActivity({
        ...attachmentViewProps,
        data: undefined,
        attachmentId: 'lens-1',
        metadata: { title: 'My lens', soType: 'lens' },
      });

      expect(creationActivity.getActions).toBeUndefined();
      expect('children' in creationActivity).toBe(false);
    });

    it('getActions omits the open-in-lens action without lens editor permission', () => {
      jest.spyOn(KibanaServices, 'get').mockReturnValue({
        lens: { canUseEditor: () => false },
      } as unknown as ReturnType<typeof KibanaServices.get>);

      const lensType = getVisualizationAttachmentType();
      const actions = lensType
        .getCreationActivity(attachmentViewProps)
        .getActions?.(attachmentViewProps)!;

      expect(actions.length).toBe(0);
    });

    it('does not set custom actions for an ES|QL visualization', () => {
      const lensType = getVisualizationAttachmentType();
      const creationActivity = lensType.getCreationActivity({
        ...attachmentViewProps,
        data: {
          state: {
            attributes: { state: { query: { esql: '' } } },
            timeRange: {},
          },
        },
      });

      expect(creationActivity.getActions).toBeUndefined();
    });

    it('renders the open visualization button correctly', () => {
      const lensType = getVisualizationAttachmentType();
      const actions = lensType
        .getCreationActivity(attachmentViewProps)
        .getActions?.(attachmentViewProps)!;

      const openLensButton = actions[0];

      const services = createStartServicesMock();
      services.lens.EmbeddableComponent = mockEmbeddableComponent;
      services.lens.canUseEditor = () => true;
      // @ts-expect-error: render exists on CustomAttachmentAction
      renderWithTestingProviders(openLensButton.render(), { wrapperProps: { services } });

      expect(screen.getByTestId('cases-open-in-visualization-btn')).toBeInTheDocument();
    });

    it('renders the children correctly', async () => {
      const lensType = getVisualizationAttachmentType();
      // eslint-disable-next-line testing-library/no-node-access
      const Component = lensType.getCreationActivity(attachmentViewProps).children!;

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

    it('renders saved-object snapshot children correctly', async () => {
      const lensType = getVisualizationAttachmentType();
      const viewProps = {
        ...attachmentViewProps,
        attachmentId: 'lens-1',
        metadata: { title: 'My lens', soType: 'lens' },
        data: {
          attributes: { state: { query: {} } },
        },
      };
      // eslint-disable-next-line testing-library/no-node-access
      const Component = lensType.getCreationActivity(viewProps).children!;

      const services = createStartServicesMock();
      services.lens.EmbeddableComponent = mockEmbeddableComponent;

      renderWithTestingProviders(
        <Suspense fallback={'Loading...'}>
          <Component {...viewProps} />
        </Suspense>,
        { wrapperProps: { services } }
      );

      await waitFor(() => {
        expect(screen.getByTestId('embeddableComponent'));
      });

      expect(mockEmbeddableComponent).toHaveBeenCalledWith(
        expect.objectContaining({
          timeRange: undefined,
        }),
        {}
      );
    });

    it('renders saved-object snapshot children with their stored time range', async () => {
      const lensType = getVisualizationAttachmentType();
      const viewProps = {
        ...attachmentViewProps,
        attachmentId: 'lens-1',
        metadata: { title: 'My lens', soType: 'lens' },
        data: {
          attributes: { state: { query: {} } },
          timeRange: { from: 'now-15m', to: 'now' },
        },
      };
      // eslint-disable-next-line testing-library/no-node-access
      const Component = lensType.getCreationActivity(viewProps).children!;

      const services = createStartServicesMock();
      services.lens.EmbeddableComponent = mockEmbeddableComponent;

      renderWithTestingProviders(
        <Suspense fallback={'Loading...'}>
          <Component {...viewProps} />
        </Suspense>,
        { wrapperProps: { services } }
      );

      await waitFor(() => {
        expect(mockEmbeddableComponent).toHaveBeenCalledWith(
          expect.objectContaining({
            timeRange: { from: 'now-15m', to: 'now' },
          }),
          {}
        );
      });
    });
  });

  describe('getRemovalActivity', () => {
    it('renders the removal event correctly', () => {
      const lensType = getVisualizationAttachmentType();
      const event = lensType.getRemovalActivity?.(attachmentViewProps);

      expect(event).toEqual({ event: 'removed visualization' });
    });
  });
});
