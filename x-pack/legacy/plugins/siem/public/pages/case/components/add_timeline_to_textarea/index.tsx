/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useState } from 'react';
import { InsertTimelinePopover } from '../../../../components/insert_timeline/insert_timeline_popover';
import { InsertTimelinePopoverButton } from '../../../../components/insert_timeline/insert_timeline_popover/insert_timeline_popover_button';

const AddTimelineToTextAreaComp: React.FC = () => {
  const [showTimelinePopover, setShowTimelinePopover] = useState(false);

  const onInsertTimelinePopover = useCallback(() => {
    setShowTimelinePopover(true);
  }, []);

  const onCloseTimelinePopover = useCallback(() => {
    setShowTimelinePopover(false);
  }, []);

  return (
    <InsertTimelinePopover
      button={<InsertTimelinePopoverButton onClick={onInsertTimelinePopover} />}
      isOpen={showTimelinePopover}
      onClose={onCloseTimelinePopover}
    />
  );
};
// <EuiButtonIcon
//   isDisabled={isLoading}
//   href="http://www.elastic.co"
//   iconType="link"
//   aria-label="This is a link"
// />
// <InsertTimelinePopover
//   hideActions={actionTimelineToHide}
//   modalTitle={i18n.IMPORT_TIMELINE_MODAL}
//   onClose={onCloseTimelinePopover}
//   onOpen={onInsertTimeline}
// />

export const AddTimelineToTextArea = React.memo(AddTimelineToTextAreaComp);
