/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { EuiToolTip, EuiButtonIcon } from '@elastic/eui';

import * as i18n from './translations';

interface UserActionMoveToReferenceProps {
  id: string;
  outlineComment: (id: string) => void;
}

const UserActionMoveToReferenceComponent = ({
  id,
  outlineComment,
}: UserActionMoveToReferenceProps) => {
  const handleMoveToLink = useCallback(() => {
    outlineComment(id);
  }, [id, outlineComment]);

  return (
    <EuiToolTip position="top" content={<p>{i18n.MOVE_TO_ORIGINAL_COMMENT}</p>}>
      <EuiButtonIcon
        aria-label={i18n.MOVE_TO_ORIGINAL_COMMENT}
        data-test-subj={`move-to-link-${id}`}
        onClick={handleMoveToLink}
        iconType="arrowUp"
      />
    </EuiToolTip>
  );
};
UserActionMoveToReferenceComponent.displayName = 'UserActionMoveToReference';

export const UserActionMoveToReference = memo(UserActionMoveToReferenceComponent);
