/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import deepEqual from 'fast-deep-equal';
import * as rt from 'io-ts';
import { isRight } from 'fp-ts/Either';
import { LENS_ATTACHMENT_TYPE } from '../../../../common/constants';
import * as i18n from './translations';

import type {
  UnifiedValueAttachmentType,
  UnifiedValueAttachmentViewProps,
} from '../../../client/attachment_framework/types';
import { AttachmentActionType } from '../../../client/attachment_framework/types';
import type { LensProps } from './types';
import { OpenLensButton } from './open_lens_button';
import { LensRenderer } from './lens_renderer';

function getOpenLensButton(savedObjectId: string, props: LensProps) {
  return (
    <OpenLensButton
      savedObjectId={savedObjectId}
      attributes={props.attributes}
      timeRange={props.timeRange}
      metadata={props.metadata}
    />
  );
}

const getVisualizationAttachmentActions = (savedObjectId: string, props: LensProps) => [
  {
    type: AttachmentActionType.CUSTOM as const,
    render: () => getOpenLensButton(savedObjectId, props),
    isPrimary: false,
  },
];

const LensAttachment = React.memo(
  (props: UnifiedValueAttachmentViewProps) => {
    const { attributes, timeRange, metadata } = props.data.state as unknown as LensProps;
    return <LensRenderer attributes={attributes} timeRange={timeRange} metadata={metadata} />;
  },
  (prevProps, nextProps) => deepEqual(prevProps.data.state, nextProps.data.state)
);

LensAttachment.displayName = 'LensAttachment';

const LensAttachmentRendererLazyComponent = React.lazy(async () => {
  return {
    default: LensAttachment,
  };
});

const getVisualizationAttachmentViewObject = ({
  savedObjectId,
  data,
}: UnifiedValueAttachmentViewProps) => {
  const { attributes: lensAttributes, timeRange: lensTimeRange } =
    data.state as unknown as LensProps;

  return {
    event: i18n.ADDED_VISUALIZATION,
    timelineAvatar: 'lensApp',
    getActions: () =>
      getVisualizationAttachmentActions(savedObjectId, {
        attributes: lensAttributes,
        timeRange: lensTimeRange,
      }),
    hideDefaultActions: false,
    children: LensAttachmentRendererLazyComponent,
  };
};

const LensDataRt = rt.strict({ data: rt.strict({ state: rt.record(rt.string, rt.unknown) }) });

const lensSchemaValidator = (attachment: unknown): void => {
  const result = LensDataRt.decode(attachment);
  if (!isRight(result)) {
    throw new Error('Invalid lens attachment data: expected { state: Record<string, unknown> }');
  }
};

export const getVisualizationAttachmentType = (): UnifiedValueAttachmentType => ({
  id: LENS_ATTACHMENT_TYPE,
  icon: 'document',
  displayName: i18n.VISUALIZATIONS,
  getAttachmentViewObject: getVisualizationAttachmentViewObject,
  getAttachmentRemovalObject: () => ({ event: i18n.REMOVED_VISUALIZATION }),
  schemaValidator: lensSchemaValidator,
});
