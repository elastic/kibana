/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCommentList } from '@elastic/eui';
import { screen } from '@testing-library/react';
import { z } from '@kbn/zod/v4';
import { UserActionActions } from '../../../common/types/domain';
import type { UnifiedReferenceAttachmentType } from '../../client/attachment_framework/types';
import { renderWithTestingProviders } from '../../common/mock';
import { getUserAction } from '../../containers/mock';
import { getMockBuilderArgs } from './mock';
import { createBulkAttachmentsUserActionBuilder } from './bulk_attachments';

jest.mock('../../common/lib/kibana');
jest.mock('../../common/navigation/hooks');

const widgetAttachmentType: UnifiedReferenceAttachmentType = {
  id: 'test.widget',
  schema: z.object({}),
  getIcon: () => 'dot',
  getLabel: () => 'Widgets',
  getCreationActivity: () => ({ event: 'added a widget' }),
};

describe('createBulkAttachmentsUserActionBuilder', () => {
  const renderUserAction = (
    attachmentType: string,
    count: number,
    registeredType?: UnifiedReferenceAttachmentType
  ) => {
    const builderArgs = getMockBuilderArgs();
    if (registeredType != null) {
      builderArgs.unifiedAttachmentTypeRegistry.register(registeredType);
    }

    const userAction = getUserAction('bulkAttachments', UserActionActions.delete, {
      payload: { bulkAttachments: { attachmentType, count } },
    });
    const comments = createBulkAttachmentsUserActionBuilder({
      ...builderArgs,
      userAction,
    }).build();

    renderWithTestingProviders(<EuiCommentList comments={comments} />);
    return comments;
  };

  it('renders the section label of the registered type', () => {
    renderUserAction('test.widget', 3, widgetAttachmentType);

    expect(screen.getByTestId('bulk-attachments-action')).toHaveTextContent(
      'removed 3 items from Widgets'
    );
  });

  it('renders the count label of the registered type', () => {
    renderUserAction('test.widget', 2, {
      ...widgetAttachmentType,
      getCountLabel: ({ count }) => `${count} widgets`,
    });

    expect(screen.getByTestId('bulk-attachments-action')).toHaveTextContent('removed 2 widgets');
  });

  it('leaves out the section when the type is not registered', () => {
    renderUserAction('unknown.type', 1);

    expect(screen.getByTestId('bulk-attachments-action')).toHaveTextContent(/^removed 1 item$/);
  });

  it('renders nothing when no attachments were removed', () => {
    expect(renderUserAction('test.widget', 0, widgetAttachmentType)).toEqual([]);
  });
});
