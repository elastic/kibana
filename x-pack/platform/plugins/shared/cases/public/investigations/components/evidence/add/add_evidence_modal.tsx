/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButtonEmpty,
  EuiCard,
  EuiFlexGrid,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiText,
  EuiIcon,
  EuiSpacer,
  useGeneratedHtmlId,
} from '@elastic/eui';
import {
  ADDABLE_EVIDENCE_TYPES,
  EVIDENCE_TYPE_LABELS,
} from '../../../../../common/investigations/types';
import type { EvidenceType } from '../../../../../common/investigations/types';
import { EVIDENCE_TYPE_ICONS } from '../../../icons';
import type { AddFormProps } from './add_form_layout';
import { AlertForm } from './alert_form';
import { EntityForm } from './entity_form';
import { FileForm } from './file_form';
import { IndicatorForm } from './indicator_form';
import { NoteForm } from './note_form';
import { QueryForm } from './query_form';
import { SavedSearchForm } from './saved_search_form';
import { VisualizationForm } from './visualization_form';
import * as i18n from '../translations';

const KIND_DESCRIPTIONS: Partial<Record<EvidenceType, string>> = {
  saved_search: i18n.KIND_SAVED_SEARCH_DESCRIPTION,
  entity: i18n.KIND_ENTITY_DESCRIPTION,
  indicator: i18n.KIND_INDICATOR_DESCRIPTION,
  alert: i18n.KIND_ALERT_DESCRIPTION,
  query: i18n.KIND_QUERY_DESCRIPTION,
  visualization: i18n.KIND_VISUALIZATION_DESCRIPTION,
  file: i18n.KIND_FILE_DESCRIPTION,
  note: i18n.KIND_NOTE_DESCRIPTION,
};

const FORMS: Partial<Record<EvidenceType, React.FC<AddFormProps>>> = {
  saved_search: SavedSearchForm,
  entity: EntityForm,
  alert: AlertForm,
  query: QueryForm,
  visualization: VisualizationForm,
  file: FileForm,
  note: NoteForm,
};

export interface AddEvidenceModalProps {
  recordId: string;
  /** Skip the kind picker, for example to open the indicator import directly. */
  initialKind?: EvidenceType;
  initialIndicatorMode?: 'single' | 'import';
  onClose: () => void;
}

export const AddEvidenceModal: React.FC<AddEvidenceModalProps> = ({
  recordId,
  initialKind,
  initialIndicatorMode,
  onClose,
}) => {
  const titleId = useGeneratedHtmlId({ prefix: 'investigationEvidenceAddTitle' });
  const [kind, setKind] = useState<EvidenceType | undefined>(initialKind);

  const FormComponent = kind ? FORMS[kind] : undefined;
  const formProps: AddFormProps = { recordId, onDone: onClose, onBack: () => setKind(undefined) };

  return (
    <EuiModal
      onClose={onClose}
      aria-labelledby={titleId}
      maxWidth={680}
      data-test-subj="investigationEvidenceAddModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>
          {kind ? i18n.ADD_KIND_TITLE(EVIDENCE_TYPE_LABELS[kind].toLowerCase()) : i18n.ADD_EVIDENCE}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      {kind === undefined ? (
        <>
          <EuiModalBody>
            <EuiText size="s" color="subdued">
              <p>{i18n.ADD_INTRO}</p>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiFlexGrid columns={2} gutterSize="m">
              {ADDABLE_EVIDENCE_TYPES.map((type) => (
                <EuiFlexItem key={type}>
                  <EuiCard
                    layout="horizontal"
                    titleSize="xs"
                    icon={<EuiIcon type={EVIDENCE_TYPE_ICONS[type]} size="l" aria-hidden="true" />}
                    title={EVIDENCE_TYPE_LABELS[type]}
                    description={KIND_DESCRIPTIONS[type] ?? ''}
                    onClick={() => setKind(type)}
                    data-test-subj={`investigationEvidenceAddKind-${type}`}
                  />
                </EuiFlexItem>
              ))}
            </EuiFlexGrid>
            <EuiSpacer size="s" />
          </EuiModalBody>
          <EuiModalFooter>
            <EuiButtonEmpty onClick={onClose} data-test-subj="investigationEvidenceAddCancel">
              {i18n.CANCEL}
            </EuiButtonEmpty>
          </EuiModalFooter>
        </>
      ) : kind === 'indicator' ? (
        <IndicatorForm {...formProps} initialMode={initialIndicatorMode} />
      ) : FormComponent ? (
        <FormComponent {...formProps} />
      ) : null}
    </EuiModal>
  );
};
AddEvidenceModal.displayName = 'AddEvidenceModal';
