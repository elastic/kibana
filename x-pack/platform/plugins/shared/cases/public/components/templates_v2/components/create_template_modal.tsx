/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { TemplateMetadata } from '../utils/template_metadata';
import {
  hasTemplateMetadataErrors,
  normalizeTemplateMetadata,
  validateTemplateMetadata,
} from '../utils/template_metadata';
import { TemplateMetadataForm } from './template_metadata_form';
import * as i18n from '../translations';

interface CreateTemplateModalProps {
  /** Seeded from any in-progress draft so a returning user is not asked to retype what they had. */
  initialMetadata: TemplateMetadata;
  onCancel: () => void;
  onConfirm: (metadata: TemplateMetadata) => void;
}

/**
 * Collects a new template's identity before the editor opens.
 *
 * The template name is required, but it lives on the editor's Configuration tab while the editor
 * opens on Fields — so the one mandatory step was behind a tab the user had no reason to visit, and
 * the failure only surfaced at save. This follows the same shape Kibana uses elsewhere for "name it,
 * then edit it" (the saved-object save modal): a small modal for identity, then straight into the
 * editor with the required work already done.
 *
 * It composes the same `TemplateMetadataForm` and the same validators the Configuration tab uses, so
 * the rules cannot drift between the two places a template can be named.
 */
export const CreateTemplateModal: React.FC<CreateTemplateModalProps> = ({
  initialMetadata,
  onCancel,
  onConfirm,
}) => {
  const modalTitleId = useGeneratedHtmlId();
  const [metadata, setMetadata] = useState<TemplateMetadata>(initialMetadata);
  // Errors stay hidden until the first submit, so an untouched form does not open pre-flagged.
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const errors = useMemo(() => validateTemplateMetadata(metadata), [metadata]);
  const isInvalid = hasTemplateMetadataErrors(errors);

  const handleConfirm = useCallback(() => {
    setHasSubmitted(true);
    if (!isInvalid) {
      onConfirm(normalizeTemplateMetadata(metadata));
    }
  }, [isInvalid, metadata, onConfirm]);

  return (
    <EuiModal
      onClose={onCancel}
      aria-labelledby={modalTitleId}
      data-test-subj="createTemplateModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          {i18n.CREATE_TEMPLATE_MODAL_TITLE}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiText size="s" color="subdued">
          <p>{i18n.CREATE_TEMPLATE_MODAL_DESCRIPTION}</p>
        </EuiText>
        <EuiSpacer size="m" />
        {/* `compact` drops the form's own section heading and blurb. Those are written for the
            Configuration tab ("edited here", "not part of the YAML definition") and are both wrong
            and redundant stacked under a modal that has already said what this step is. */}
        <TemplateMetadataForm
          metadata={metadata}
          errors={hasSubmitted ? errors : {}}
          onChange={setMetadata}
          compact
        />
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty onClick={onCancel} data-test-subj="createTemplateModalCancel">
          {i18n.CANCEL}
        </EuiButtonEmpty>
        {/* Deliberately never disabled: a disabled primary button gives no reason why. Submitting an
            incomplete form reveals the error on the field that needs attention instead. */}
        <EuiButton fill onClick={handleConfirm} data-test-subj="createTemplateModalConfirm">
          {i18n.CREATE_TEMPLATE_MODAL_CONFIRM}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};

CreateTemplateModal.displayName = 'CreateTemplateModal';
