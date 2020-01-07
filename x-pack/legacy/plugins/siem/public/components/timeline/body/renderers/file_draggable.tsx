/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { DraggableBadge } from '../../../draggables';

import { isNillEmptyOrNotFinite, TokensFlexItem } from './helpers';
import * as i18n from './translations';

interface Props {
  contextId: string;
  endgameFileName: string | null | undefined;
  endgameFilePath: string | null | undefined;
  eventId: string;
  fileName: string | null | undefined;
  filePath: string | null | undefined;
}

export const FileDraggable = React.memo<Props>(
  ({ contextId, endgameFileName, endgameFilePath, eventId, fileName, filePath }) => {
    if (
      isNillEmptyOrNotFinite(fileName) &&
      isNillEmptyOrNotFinite(endgameFileName) &&
      isNillEmptyOrNotFinite(filePath) &&
      isNillEmptyOrNotFinite(endgameFilePath)
    ) {
      return null;
    }

    const filePathIsKnown =
      !isNillEmptyOrNotFinite(filePath) || !isNillEmptyOrNotFinite(endgameFilePath);

    return (
      <>
        {!isNillEmptyOrNotFinite(fileName) ? (
          <TokensFlexItem component="span" grow={false}>
            <DraggableBadge
              contextId={contextId}
              eventId={eventId}
              field="file.name"
              iconType="document"
              value={fileName}
            />
          </TokensFlexItem>
        ) : !isNillEmptyOrNotFinite(endgameFileName) ? (
          <TokensFlexItem component="span" grow={false}>
            <DraggableBadge
              contextId={contextId}
              eventId={eventId}
              field="endgame.file_name"
              iconType="document"
              value={endgameFileName}
            />
          </TokensFlexItem>
        ) : null}

        {filePathIsKnown && (
          <TokensFlexItem component="span" data-test-subj="in" grow={false}>
            {i18n.IN}
          </TokensFlexItem>
        )}

        {!isNillEmptyOrNotFinite(filePath) ? (
          <TokensFlexItem component="span" grow={false}>
            <DraggableBadge
              contextId={contextId}
              eventId={eventId}
              field="file.path"
              iconType="document"
              value={filePath}
            />
          </TokensFlexItem>
        ) : !isNillEmptyOrNotFinite(endgameFilePath) ? (
          <TokensFlexItem component="span" grow={false}>
            <DraggableBadge
              contextId={contextId}
              eventId={eventId}
              field="endgame.file_path"
              iconType="document"
              value={endgameFilePath}
            />
          </TokensFlexItem>
        ) : null}
      </>
    );
  }
);

FileDraggable.displayName = 'FileDraggable';
