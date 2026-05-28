/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiCallOut,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiText,
  EuiTextArea,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { EntityTypeDraft, GeneralFields } from '../fake_entity_type_draft';

interface Props {
  readonly draft: EntityTypeDraft;
  readonly onChange: (next: GeneralFields) => void;
}

export const GeneralStep = ({ draft, onChange }: Props) => {
  const isManaged = draft.entityType.generatedBy === 'Elastic';
  const { general } = draft;

  const update = (patch: Partial<GeneralFields>) => onChange({ ...general, ...patch });

  return (
    <EuiForm component="form" data-test-subj="entityCentricLabEditFlyoutGeneralStep">
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued">
            <p>
              {isManaged
                ? i18n.translate(
                    'xpack.streams.entityCentricLab.editFlyout.general.subtitleManaged',
                    {
                      defaultMessage: 'Managed entity types general data cannot be all customised.',
                    }
                  )
                : i18n.translate('xpack.streams.entityCentricLab.editFlyout.general.subtitleUser', {
                    defaultMessage: 'Define how this entity type is identified in your data.',
                  })}
            </p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow
            label={i18n.translate(
              'xpack.streams.entityCentricLab.editFlyout.general.entityTypeName',
              { defaultMessage: 'Entity type name' }
            )}
            fullWidth
          >
            <EuiFieldText
              fullWidth
              readOnly={isManaged}
              value={general.name}
              onChange={(event) => update({ name: event.target.value })}
              data-test-subj="entityCentricLabEditFlyoutGeneralName"
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="m">
            <EuiFlexItem>
              <EuiFormRow
                label={i18n.translate(
                  'xpack.streams.entityCentricLab.editFlyout.general.dataStream',
                  { defaultMessage: 'Data stream' }
                )}
                fullWidth
              >
                <EuiFieldText
                  fullWidth
                  readOnly={isManaged}
                  value={general.dataStream}
                  onChange={(event) => update({ dataStream: event.target.value })}
                  data-test-subj="entityCentricLabEditFlyoutGeneralDataStream"
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFormRow
                label={i18n.translate(
                  'xpack.streams.entityCentricLab.editFlyout.general.identifierField',
                  { defaultMessage: 'Stream field that identifies the entity' }
                )}
                fullWidth
              >
                <EuiFieldText
                  fullWidth
                  readOnly={isManaged}
                  value={general.identifierField}
                  onChange={(event) => update({ identifierField: event.target.value })}
                  data-test-subj="entityCentricLabEditFlyoutGeneralIdentifierField"
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow
            label={i18n.translate('xpack.streams.entityCentricLab.editFlyout.general.category', {
              defaultMessage: 'Category',
            })}
            fullWidth
          >
            <EuiFieldText
              fullWidth
              readOnly={isManaged}
              value={general.category}
              onChange={(event) => update({ category: event.target.value })}
              data-test-subj="entityCentricLabEditFlyoutGeneralCategory"
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow
            label={i18n.translate('xpack.streams.entityCentricLab.editFlyout.general.description', {
              defaultMessage: 'Description',
            })}
            fullWidth
          >
            <EuiTextArea
              fullWidth
              rows={4}
              readOnly={isManaged}
              value={general.description}
              onChange={(event) => update({ description: event.target.value })}
              data-test-subj="entityCentricLabEditFlyoutGeneralDescription"
            />
          </EuiFormRow>
        </EuiFlexItem>
        {isManaged ? (
          <EuiFlexItem grow={false}>
            <EuiCallOut
              announceOnMount={false}
              size="s"
              color="primary"
              iconType="info"
              title={i18n.translate(
                'xpack.streams.entityCentricLab.editFlyout.general.managedCalloutTitle',
                {
                  defaultMessage: 'This entity type is managed by Elastic',
                }
              )}
            >
              <EuiText size="s">
                <p>
                  {i18n.translate(
                    'xpack.streams.entityCentricLab.editFlyout.general.managedCalloutBody',
                    {
                      defaultMessage:
                        'Fields above describe how the entity type is detected. Customise health, ownership, flyout content and subsets in the next steps.',
                    }
                  )}
                </p>
              </EuiText>
            </EuiCallOut>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </EuiForm>
  );
};
