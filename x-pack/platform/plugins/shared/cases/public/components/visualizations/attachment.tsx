/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import deepEqual from 'fast-deep-equal';
import { LENS_ATTACHMENT_TYPE } from '../../../common/constants/visualizations';
import * as i18n from './translations';

import type {
  PersistableStateAttachmentType,
  PersistableStateAttachmentViewProps,
} from '../../client/attachment_framework/types';
import { AttachmentActionType } from '../../client/attachment_framework/types';
import type { LensProps } from './types';
import { OpenLensButton } from './open_lens_button';
import { LensRenderer } from './lens_renderer';

function getOpenLensButton(attachmentId: string, props: LensProps) {
  return (
    <OpenLensButton
      attachmentId={attachmentId}
      attributes={props.attributes}
      timeRange={props.timeRange}
      metadata={props.metadata}
    />
  );
}

const getVisualizationAttachmentActions = (attachmentId: string, props: LensProps) => [
  {
    type: AttachmentActionType.CUSTOM as const,
    render: () => getOpenLensButton(attachmentId, props),
    isPrimary: false,
  },
];

const LensAttachment = React.memo(
  (props: PersistableStateAttachmentViewProps) => {
    const { attributes, timeRange, metadata } =
      props.persistableStateAttachmentState as unknown as LensProps;

    return <LensRenderer attributes={attributes} timeRange={timeRange} metadata={metadata} />;
  },
  (prevProps, nextProps) =>
    deepEqual(prevProps.persistableStateAttachmentState, nextProps.persistableStateAttachmentState)
);

LensAttachment.displayName = 'LensAttachment';

const LensAttachmentRendererLazyComponent = React.lazy(async () => {
  return {
    default: LensAttachment,
  };
});

const getVisualizationAttachmentViewObject = ({
  attachmentId,
  persistableStateAttachmentState,
}: PersistableStateAttachmentViewProps) => {
  const { attributes: lensAttributes, timeRange: lensTimeRange } =
    persistableStateAttachmentState as unknown as LensProps;

  return {
    event: i18n.ADDED_VISUALIZATION,
    timelineAvatar: 'lensApp',
    getActions: () =>
      getVisualizationAttachmentActions(attachmentId, {
        attributes: lensAttributes,
        timeRange: lensTimeRange,
      }),
    hideDefaultActions: false,
    children: LensAttachmentRendererLazyComponent,
  };
};

export const getVisualizationAttachmentType = (): PersistableStateAttachmentType => ({
  id: LENS_ATTACHMENT_TYPE,
  icon: 'document',
  displayName: 'Visualizations',
  getAttachmentViewObject: getVisualizationAttachmentViewObject,
  getAttachmentRemovalObject: () => ({ event: i18n.REMOVED_VISUALIZATION }),
});
