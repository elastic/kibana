/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiComboBox,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSelect,
  EuiTextArea,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import {
  DREAMING_TYPE_PATTERN,
  RESERVED_ENTITY_ATTRIBUTE_KEYS,
  type DreamingEntityType,
  type DreamingFactType,
  type DreamingRelationshipType,
} from '../../../../common/dreaming';

/** Lowercase, with spaces and dashes as underscores, as names are typed. */
export const normalizeTypeName = (value: string): string =>
  value.toLowerCase().replace(/[\s-]+/g, '_');

const nameHelpText = i18n.translate('xpack.contextEngine.dreamingConfig.modal.nameHelpText', {
  defaultMessage: 'Lowercase letters, digits and underscores, such as known_issue.',
});

const nameError = (name: string, taken: readonly string[]): string | undefined => {
  if (name === '') {
    return i18n.translate('xpack.contextEngine.dreamingConfig.modal.nameRequired', {
      defaultMessage: 'Enter a name.',
    });
  }
  if (!DREAMING_TYPE_PATTERN.test(name)) {
    return i18n.translate('xpack.contextEngine.dreamingConfig.modal.nameInvalid', {
      defaultMessage: 'Use lowercase letters, digits and underscores only.',
    });
  }
  if (taken.includes(name)) {
    return i18n.translate('xpack.contextEngine.dreamingConfig.modal.nameTaken', {
      defaultMessage: '"{name}" is already used.',
      values: { name },
    });
  }
  return undefined;
};

interface TypeModalProps {
  title: string;
  /** Whether the form can be saved; errors show only after a save is tried. */
  isValid: boolean;
  onSave: () => void;
  onClose: () => void;
  children: (showErrors: boolean) => React.ReactNode;
  'data-test-subj': string;
}

const TypeModal = ({
  title,
  isValid,
  onSave,
  onClose,
  children,
  'data-test-subj': dataTestSubj,
}: TypeModalProps) => {
  const titleId = useGeneratedHtmlId();
  const [triedToSave, setTriedToSave] = useState(false);
  const save = () => {
    setTriedToSave(true);
    if (isValid) {
      onSave();
    }
  };
  return (
    <EuiModal aria-labelledby={titleId} onClose={onClose} data-test-subj={dataTestSubj}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>{title}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiForm
          component="form"
          onSubmit={(event: React.FormEvent) => {
            event.preventDefault();
            save();
          }}
        >
          {children(triedToSave)}
        </EuiForm>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose} data-test-subj="contextDreamingTypeModalCancel">
          {i18n.translate('xpack.contextEngine.dreamingConfig.modal.cancel', {
            defaultMessage: 'Cancel',
          })}
        </EuiButtonEmpty>
        <EuiButton fill onClick={save} data-test-subj="contextDreamingTypeModalSave">
          {i18n.translate('xpack.contextEngine.dreamingConfig.modal.save', {
            defaultMessage: 'Save',
          })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};

const NameField = ({
  value,
  error,
  showErrors,
  onChange,
}: {
  value: string;
  error: string | undefined;
  showErrors: boolean;
  onChange: (value: string) => void;
}) => (
  <EuiFormRow
    fullWidth
    label={i18n.translate('xpack.contextEngine.dreamingConfig.modal.nameLabel', {
      defaultMessage: 'Name',
    })}
    helpText={nameHelpText}
    isInvalid={showErrors && error !== undefined}
    error={error}
  >
    <EuiFieldText
      fullWidth
      autoFocus
      value={value}
      isInvalid={showErrors && error !== undefined}
      onChange={(event) => onChange(normalizeTypeName(event.target.value))}
      data-test-subj="contextDreamingTypeModalName"
    />
  </EuiFormRow>
);

const DescriptionField = ({
  value,
  helpText,
  onChange,
}: {
  value: string;
  helpText: string;
  onChange: (value: string) => void;
}) => (
  <EuiFormRow
    fullWidth
    label={i18n.translate('xpack.contextEngine.dreamingConfig.modal.descriptionLabel', {
      defaultMessage: 'Description',
    })}
    helpText={helpText}
  >
    <EuiTextArea
      fullWidth
      rows={3}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      data-test-subj="contextDreamingTypeModalDescription"
    />
  </EuiFormRow>
);

/** The type with its description, left out when blank. */
const withDescription = <T extends object>(
  value: T,
  description: string
): T & { description?: string } => {
  const trimmed = description.trim();
  return trimmed ? { ...value, description: trimmed } : value;
};

interface FactTypeModalProps {
  initial?: DreamingFactType;
  /** Names other fact types already use. */
  taken: readonly string[];
  onSave: (factType: DreamingFactType) => void;
  onClose: () => void;
}

export const FactTypeModal = ({ initial, taken, onSave, onClose }: FactTypeModalProps) => {
  const [name, setName] = useState(initial?.type ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const error = nameError(name, taken);
  return (
    <TypeModal
      title={
        initial
          ? i18n.translate('xpack.contextEngine.dreamingConfig.factModal.editTitle', {
              defaultMessage: 'Edit fact type',
            })
          : i18n.translate('xpack.contextEngine.dreamingConfig.factModal.addTitle', {
              defaultMessage: 'Add a fact type',
            })
      }
      isValid={error === undefined}
      onSave={() => onSave(withDescription({ type: name }, description))}
      onClose={onClose}
      data-test-subj="contextDreamingFactTypeModal"
    >
      {(showErrors) => (
        <>
          <NameField value={name} error={error} showErrors={showErrors} onChange={setName} />
          <DescriptionField
            value={description}
            onChange={setDescription}
            helpText={i18n.translate(
              'xpack.contextEngine.dreamingConfig.factModal.descriptionHelp',
              {
                defaultMessage:
                  'What dreaming should write down as this type, ideally with an example.',
              }
            )}
          />
        </>
      )}
    </TypeModal>
  );
};

const attributeError = (key: string): string | undefined =>
  !DREAMING_TYPE_PATTERN.test(key)
    ? i18n.translate('xpack.contextEngine.dreamingConfig.entityModal.attributeInvalid', {
        defaultMessage: '"{key}" must use lowercase letters, digits and underscores only.',
        values: { key },
      })
    : RESERVED_ENTITY_ATTRIBUTE_KEYS.includes(key)
    ? i18n.translate('xpack.contextEngine.dreamingConfig.entityModal.attributeReserved', {
        defaultMessage: '"{key}" is kept for dreaming’s own use.',
        values: { key },
      })
    : undefined;

interface EntityTypeModalProps {
  initial?: DreamingEntityType;
  taken: readonly string[];
  onSave: (entityType: DreamingEntityType) => void;
  onClose: () => void;
}

export const EntityTypeModal = ({ initial, taken, onSave, onClose }: EntityTypeModalProps) => {
  const [name, setName] = useState(initial?.type ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [attributes, setAttributes] = useState<string[]>(initial?.attributes ?? []);
  const [attributeMessage, setAttributeMessage] = useState<string>();
  const error = nameError(name, taken);
  return (
    <TypeModal
      title={
        initial
          ? i18n.translate('xpack.contextEngine.dreamingConfig.entityModal.editTitle', {
              defaultMessage: 'Edit entity type',
            })
          : i18n.translate('xpack.contextEngine.dreamingConfig.entityModal.addTitle', {
              defaultMessage: 'Add an entity type',
            })
      }
      isValid={error === undefined}
      onSave={() =>
        onSave(
          withDescription({ type: name, ...(attributes.length > 0 && { attributes }) }, description)
        )
      }
      onClose={onClose}
      data-test-subj="contextDreamingEntityTypeModal"
    >
      {(showErrors) => (
        <>
          <NameField value={name} error={error} showErrors={showErrors} onChange={setName} />
          <DescriptionField
            value={description}
            onChange={setDescription}
            helpText={i18n.translate(
              'xpack.contextEngine.dreamingConfig.entityModal.descriptionHelp',
              { defaultMessage: 'What counts as one, and how it is named.' }
            )}
          />
          <EuiFormRow
            fullWidth
            label={i18n.translate(
              'xpack.contextEngine.dreamingConfig.entityModal.attributesLabel',
              {
                defaultMessage: 'Attributes',
              }
            )}
            helpText={i18n.translate(
              'xpack.contextEngine.dreamingConfig.entityModal.attributesHelp',
              {
                defaultMessage:
                  'Values dreaming records on each one, such as category or region. Type a name and press Enter.',
              }
            )}
            isInvalid={attributeMessage !== undefined}
            error={attributeMessage}
          >
            <EuiComboBox
              isInvalid={attributeMessage !== undefined}
              fullWidth
              noSuggestions
              selectedOptions={attributes.map((label) => ({ label }))}
              onChange={(options) => setAttributes(options.map(({ label }) => label))}
              onCreateOption={(value) => {
                const key = normalizeTypeName(value.trim());
                const message = attributeError(key);
                setAttributeMessage(message);
                if (message === undefined && !attributes.includes(key)) {
                  setAttributes([...attributes, key]);
                }
              }}
              data-test-subj="contextDreamingEntityTypeModalAttributes"
            />
          </EuiFormRow>
        </>
      )}
    </TypeModal>
  );
};

interface RelationshipTypeModalProps {
  initial?: DreamingRelationshipType;
  taken: readonly string[];
  /** The entity types a relationship can connect. */
  entityTypes: readonly string[];
  onSave: (relationshipType: DreamingRelationshipType) => void;
  onClose: () => void;
}

export const RelationshipTypeModal = ({
  initial,
  taken,
  entityTypes,
  onSave,
  onClose,
}: RelationshipTypeModalProps) => {
  const [name, setName] = useState(initial?.type ?? '');
  const [source, setSource] = useState(initial?.source ?? entityTypes[0] ?? '');
  const [target, setTarget] = useState(initial?.target ?? entityTypes[0] ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const error = nameError(name, taken);
  const options = entityTypes.map((type) => ({ value: type, text: type }));
  return (
    <TypeModal
      title={
        initial
          ? i18n.translate('xpack.contextEngine.dreamingConfig.relationshipModal.editTitle', {
              defaultMessage: 'Edit relationship type',
            })
          : i18n.translate('xpack.contextEngine.dreamingConfig.relationshipModal.addTitle', {
              defaultMessage: 'Add a relationship type',
            })
      }
      isValid={error === undefined && source !== '' && target !== ''}
      onSave={() => onSave(withDescription({ type: name, source, target }, description))}
      onClose={onClose}
      data-test-subj="contextDreamingRelationshipTypeModal"
    >
      {(showErrors) => (
        <>
          <NameField value={name} error={error} showErrors={showErrors} onChange={setName} />
          <EuiFormRow
            fullWidth
            label={i18n.translate('xpack.contextEngine.dreamingConfig.relationshipModal.from', {
              defaultMessage: 'From',
            })}
          >
            <EuiSelect
              fullWidth
              options={options}
              value={source}
              onChange={(event) => setSource(event.target.value)}
              data-test-subj="contextDreamingRelationshipTypeModalSource"
            />
          </EuiFormRow>
          <EuiFormRow
            fullWidth
            label={i18n.translate('xpack.contextEngine.dreamingConfig.relationshipModal.to', {
              defaultMessage: 'To',
            })}
          >
            <EuiSelect
              fullWidth
              options={options}
              value={target}
              onChange={(event) => setTarget(event.target.value)}
              data-test-subj="contextDreamingRelationshipTypeModalTarget"
            />
          </EuiFormRow>
          <DescriptionField
            value={description}
            onChange={setDescription}
            helpText={i18n.translate(
              'xpack.contextEngine.dreamingConfig.relationshipModal.descriptionHelp',
              { defaultMessage: 'When one entity is linked to the other this way.' }
            )}
          />
        </>
      )}
    </TypeModal>
  );
};
