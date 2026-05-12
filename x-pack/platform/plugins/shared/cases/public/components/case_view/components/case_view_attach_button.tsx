/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiButton, EuiContextMenu, EuiPopover } from '@elastic/eui';
import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import { KibanaServices } from '../../../common/lib/kibana';
import { AttachSavedObjectModal } from './attach_saved_object_modal';
import { UploadFileModal } from '../../attachments/file/upload_file_modal';
import * as i18n from './translations';

export interface CaseViewAttachButtonProps {
  caseId: string;
  caseOwner: string;
  isDisabled?: boolean;
}

type ActiveModal = 'file' | 'savedObjects' | null;

const CaseViewAttachButtonComponent: React.FC<CaseViewAttachButtonProps> = ({
  caseId,
  caseOwner,
  isDisabled,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  const closePopover = useCallback(() => setIsPopoverOpen(false), []);
  const togglePopover = useCallback(() => setIsPopoverOpen((open) => !open), []);
  const closeModal = useCallback(() => setActiveModal(null), []);

  const openFile = useCallback(() => {
    closePopover();
    setActiveModal('file');
  }, [closePopover]);

  const openSavedObjects = useCallback(() => {
    closePopover();
    setActiveModal('savedObjects');
  }, [closePopover]);

  const panels = useMemo<EuiContextMenuPanelDescriptor[]>(
    () => [
      {
        id: 0,
        items: [
          {
            name: i18n.ATTACH_MENU_FILE,
            onClick: openFile,
            'data-test-subj': 'case-view-attach-menu-file',
          },
          {
            name: i18n.ATTACH_MENU_SAVED_OBJECTS,
            onClick: openSavedObjects,
            'data-test-subj': 'case-view-attach-menu-saved-objects',
          },
        ],
      },
    ],
    [openFile, openSavedObjects]
  );

  const button = (
    <EuiButton
      iconType="plusInCircle"
      iconSide="left"
      onClick={togglePopover}
      isDisabled={isDisabled}
      data-test-subj="case-view-attach-button"
    >
      {i18n.ATTACH_BUTTON_LABEL}
    </EuiButton>
  );

  return (
    <>
      <EuiPopover
        aria-label={i18n.ATTACH_MENU_LABEL}
        button={button}
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
        anchorPosition="downLeft"
        data-test-subj="case-view-attach-popover"
      >
        <EuiContextMenu initialPanelId={0} panels={panels} />
      </EuiPopover>
      {activeModal === 'file' && <UploadFileModal caseId={caseId} onClose={closeModal} />}
      {activeModal === 'savedObjects' && (
        <AttachSavedObjectModal caseId={caseId} caseOwner={caseOwner} onClose={closeModal} />
      )}
    </>
  );
};

CaseViewAttachButtonComponent.displayName = 'CaseViewAttachButton';

const CaseViewAttachButtonMemo = React.memo(CaseViewAttachButtonComponent);

/**
 * Top-level entry point that gates rendering by the `attachments.enabled`
 * feature flag. The new attach UX surfaces saved-object attachment types that
 * have no transformers when the flag is off, so we hide the entire control
 * rather than a partial menu.
 */
const CaseViewAttachButtonGate: React.FC<CaseViewAttachButtonProps> = (props) => {
  const isEnabled = KibanaServices.getConfig()?.attachments?.enabled ?? false;
  if (!isEnabled) return null;
  return <CaseViewAttachButtonMemo {...props} />;
};

CaseViewAttachButtonGate.displayName = 'CaseViewAttachButton';

export const CaseViewAttachButton = React.memo(CaseViewAttachButtonGate);
