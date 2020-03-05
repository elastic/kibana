/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useState } from 'react';
import { InsertTimelineModal } from '../../../../components/insert_timeline/insert_timeline_modal';
import { InsertTimelineModalButton } from '../../../../components/insert_timeline/insert_timeline_modal/insert_timeline_modal_button';

const AddTimelineToTextAreaComp: React.FC = () => {
  const [showTimelineModal, setShowTimelineModal] = useState(false);

  const onInsertTimelineModal = useCallback(() => {
    setShowTimelineModal(true);
  }, []);

  const onCloseTimelineModal = useCallback(() => {
    setShowTimelineModal(false);
  }, []);

  return (
    <>
      <InsertTimelineModalButton onClick={onInsertTimelineModal} />
      {showTimelineModal && <InsertTimelineModal onClose={onCloseTimelineModal} />}
    </>
  );
};
// <EuiButtonIcon
//   isDisabled={isLoading}
//   href="http://www.elastic.co"
//   iconType="link"
//   aria-label="This is a link"
// />
// <InsertTimelineModal
//   hideActions={actionTimelineToHide}
//   modalTitle={i18n.IMPORT_TIMELINE_MODAL}
//   onClose={onCloseTimelineModal}
//   onOpen={onInsertTimeline}
// />

export const AddTimelineToTextArea = React.memo(AddTimelineToTextAreaComp);
