/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiFieldText,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiSelectable,
  EuiSelect,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';
import { css } from '@emotion/react';
import { ENTITY_TYPE_LABELS } from '../../../../../common/investigations/types';
import type { EntityType } from '../../../../../common/investigations/types';
import { INVESTIGATION_LIMITS } from '../../../../../common/investigations/constants';
import { useRecordEntities } from '../use_evidence_queries';
import { AddFormLayout } from './add_form_layout';
import type { AddFormProps } from './add_form_layout';
import { SharedFields } from './common_fields';
import { toEvidenceInput, useCreateEvidence } from './use_create_evidence';
import { useSharedFields } from './use_shared_fields';
import * as i18n from '../translations';

const FORM_ID = 'investigationEvidenceAddEntity';

const TYPE_OPTIONS = (Object.keys(ENTITY_TYPE_LABELS) as EntityType[]).map((type) => ({
  value: type,
  text: ENTITY_TYPE_LABELS[type],
}));

export const EntityForm: React.FC<AddFormProps> = ({ recordId, onDone, onBack }) => {
  const { euiTheme } = useEuiTheme();
  const { entities, isLoading } = useRecordEntities(recordId, true);
  const shared = useSharedFields(recordId);
  const { create, isLoading: isSaving } = useCreateEvidence(recordId);
  const [isManual, setIsManual] = useState(false);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [name, setName] = useState('');
  const [entityType, setEntityType] = useState<EntityType>('host');
  const [showErrors, setShowErrors] = useState(false);

  const hasEntities = entities.length > 0;
  const manual = isManual || (!isLoading && !hasEntities);
  const selected = entities.find(({ id }) => id === selectedId);

  const options = useMemo<EuiSelectableOption[]>(
    () =>
      entities.map((entity) => ({
        key: entity.id,
        label: entity.entity.name,
        checked: entity.id === selectedId ? 'on' : undefined,
        append: (
          <EuiText size="xs" color="subdued">
            {ENTITY_TYPE_LABELS[entity.entity.type]}
          </EuiText>
        ),
        'data-test-subj': `investigationEvidenceAddOption-${entity.ref}`,
      })),
    [entities, selectedId]
  );

  const resolvedName = manual ? name.trim() : selected?.entity.name ?? '';
  const resolvedType: EntityType = manual ? entityType : selected?.entity.type ?? 'host';
  const nameError =
    showErrors && resolvedName.length === 0
      ? manual
        ? i18n.ENTITY_NAME_REQUIRED
        : i18n.ENTITY_CHOOSE
      : undefined;

  const submit = async () => {
    setShowErrors(true);
    if (resolvedName.length === 0) {
      return;
    }
    const attributes: Array<[string, string]> = [
      [i18n.ENTITY_ATTRIBUTE_TYPE, ENTITY_TYPE_LABELS[resolvedType]],
      [i18n.ENTITY_ATTRIBUTE_NAME, resolvedName],
    ];
    if (selected) {
      const { criticality, risk_level: riskLevel, risk_score: riskScore } = selected.entity;
      if (criticality) attributes.push([i18n.ENTITY_ATTRIBUTE_CRITICALITY, criticality]);
      if (riskScore !== null && riskScore !== undefined) {
        attributes.push([
          i18n.ENTITY_ATTRIBUTE_RISK,
          riskLevel ? `${riskScore} ${riskLevel}` : String(riskScore),
        ]);
      }
      selected.entity.attributes.forEach((pair) => attributes.push(pair));
    }
    try {
      await create({
        claim: shared.claim,
        inputs: [
          toEvidenceInput(`${ENTITY_TYPE_LABELS[resolvedType]} ${resolvedName}`, {
            type: 'entity',
            why: shared.trimmedWhy,
            entity_id: selected?.id ?? null,
            source: { label: i18n.SOURCE_ENTITY, kind: 'entity' },
            snapshot: { kind: 'entity', attributes },
          }),
        ],
      });
      onDone();
    } catch {
      // The mutation already showed the error.
    }
  };

  return (
    <AddFormLayout
      formId={FORM_ID}
      onBack={onBack}
      onSubmit={() => void submit()}
      isLoading={isSaving}
    >
      {isLoading ? (
        <EuiLoadingSpinner size="l" />
      ) : manual ? (
        <>
          <EuiFormRow
            label={i18n.ENTITY_NAME_LABEL}
            isInvalid={Boolean(nameError)}
            error={nameError}
            fullWidth
          >
            <EuiFieldText
              fullWidth
              value={name}
              isInvalid={Boolean(nameError)}
              maxLength={INVESTIGATION_LIMITS.maxTitleLength}
              onChange={(event) => setName(event.target.value)}
              data-test-subj="investigationEvidenceAddEntityName"
            />
          </EuiFormRow>
          <EuiFormRow label={i18n.ENTITY_TYPE_LABEL} fullWidth>
            <EuiSelect
              fullWidth
              options={TYPE_OPTIONS}
              value={entityType}
              onChange={(event) => setEntityType(event.target.value as EntityType)}
              data-test-subj="investigationEvidenceAddEntityType"
            />
          </EuiFormRow>
        </>
      ) : (
        <EuiFormRow
          label={i18n.ENTITY_LABEL}
          isInvalid={Boolean(nameError)}
          error={nameError}
          fullWidth
        >
          <EuiSelectable
            aria-label={i18n.ENTITY_LABEL}
            singleSelection="always"
            searchable
            searchProps={{ compressed: true, placeholder: i18n.PICKER_SEARCH_PLACEHOLDER }}
            options={options}
            listProps={{ onFocusBadge: false, rowHeight: euiTheme.base * 2.25 }}
            height={200}
            onChange={(changed) => {
              const checked = changed.find(({ checked: state }) => state === 'on');
              setSelectedId(checked ? String(checked.key) : undefined);
            }}
            css={css`
              border: ${euiTheme.border.thin};
              border-radius: ${euiTheme.border.radius.medium};
            `}
            data-test-subj="investigationEvidenceAddPicker"
          >
            {(list, search) => (
              <>
                {search}
                {list}
              </>
            )}
          </EuiSelectable>
        </EuiFormRow>
      )}
      {hasEntities ? (
        <EuiButtonEmpty
          size="xs"
          flush="left"
          onClick={() => setIsManual((current) => !current)}
          data-test-subj="investigationEvidenceAddToggleManual"
        >
          {manual ? i18n.PICK_FROM_SCOPE : i18n.ENTER_MANUALLY}
        </EuiButtonEmpty>
      ) : null}
      <SharedFields
        value={shared.why}
        onChange={shared.setWhy}
        claims={shared.claims}
        claimId={shared.claimId}
        onClaimChange={shared.setClaimId}
      />
    </AddFormLayout>
  );
};
EntityForm.displayName = 'EntityForm';
