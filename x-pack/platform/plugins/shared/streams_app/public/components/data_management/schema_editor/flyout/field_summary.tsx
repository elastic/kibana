/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIconTip,
  EuiTitle,
} from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { Streams, isRoot } from '@kbn/streams-schema';
import { useStreamsAppRouter } from '../../../../hooks/use_streams_app_router';
import { InfoPanel } from '../../../info_panel';
import { FieldParent } from '../field_parent';
import { FieldStatusBadge } from '../field_status';
import { FieldFormFormat, typeSupportsFormat } from './field_form_format';
import { FieldFormType } from './field_form_type';
import { ChildrenAffectedCallout } from './children_affected_callout';
import { EMPTY_CONTENT } from '../constants';
import type { SchemaField } from '../types';

const title = i18n.translate('xpack.streams.streamDetailSchemaEditorFieldSummaryTitle', {
  defaultMessage: 'Field summary',
});

const FIELD_SUMMARIES = {
  fieldStatus: {
    label: i18n.translate('xpack.streams.streamDetailSchemaEditorFieldSummaryFieldNameHeader', {
      defaultMessage: 'Status',
    }),
  },
  fieldType: {
    label: i18n.translate('xpack.streams.streamDetailSchemaEditorFieldSummaryFieldTypeHeader', {
      defaultMessage: 'Type',
    }),
  },
  fieldFormat: {
    label: i18n.translate('xpack.streams.streamDetailSchemaEditorFieldSummaryFieldFormatHeader', {
      defaultMessage: 'Format',
    }),
  },
  fieldParent: {
    label: i18n.translate('xpack.streams.streamDetailSchemaEditorFieldSummaryFieldParentHeader', {
      defaultMessage: 'Field Parent',
    }),
  },
};

interface FieldSummaryProps {
  field: SchemaField;
  isEditing: boolean;
  toggleEditMode: () => void;
  stream: Streams.ingest.all.Definition;
  onChange: (field: Partial<SchemaField>) => void;
  enableGeoPointSuggestions?: boolean;
  onGoToField?: (fieldName: string) => void;
}

export const FieldSummary = (props: FieldSummaryProps) => {
  const {
    field,
    isEditing,
    toggleEditMode,
    onChange,
    stream,
    enableGeoPointSuggestions,
    onGoToField,
  } = props;

  const router = useStreamsAppRouter();

  const streamType = Streams.WiredStream.Definition.is(stream) ? 'wired' : 'classic';
  const showHeaderActions = Boolean(
    (field.status !== 'inherited' && !isEditing) ||
      (field.status === 'inherited' && !isRoot(field.parent)) ||
      (field.alias_for && onGoToField)
  );

  const headerActions = showHeaderActions ? (
    <EuiFlexGroup gutterSize="s" justifyContent="flexEnd" responsive={false} wrap>
      {field.status !== 'inherited' && !isEditing ? (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            data-test-subj="streamsAppFieldSummaryEditButton"
            size="s"
            color="primary"
            onClick={toggleEditMode}
            iconType="pencil"
          >
            {i18n.translate('xpack.streams.fieldSummary.editButtonLabel', {
              defaultMessage: 'Edit',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      ) : null}
      {field.status === 'inherited' && !isRoot(field.parent) ? (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            data-test-subj="streamsAppFieldSummaryOpenInParentButton"
            size="s"
            color="primary"
            iconType="popout"
            href={router.link('/{key}/management/{tab}', {
              path: {
                key: field.parent,
                tab: 'schema',
              },
            })}
            target="_blank"
          >
            {i18n.translate('xpack.streams.fieldSummary.editInParentButtonLabel', {
              defaultMessage: 'Edit in parent stream',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      ) : null}
      {field.alias_for && onGoToField ? (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            data-test-subj="streamsAppFieldSummaryGoToFieldButton"
            size="xs"
            color="primary"
            onClick={() => onGoToField(field.alias_for!)}
          >
            {i18n.translate('xpack.streams.fieldSummary.goToFieldButtonLabel', {
              defaultMessage: 'Go to source field',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  ) : undefined;

  return (
    <>
      <InfoPanel title={title} headerRightContent={headerActions}>
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexGroup>
            <EuiFlexItem grow={1}>
              <EuiTitle size="xxs">
                <span>
                  {FIELD_SUMMARIES.fieldStatus.label}{' '}
                  <EuiIconTip
                    type="info"
                    color="subdued"
                    content={i18n.translate('xpack.streams.fieldSummary.statusTooltip', {
                      defaultMessage:
                        'Indicates whether the field is actively mapped for use in the configuration or remains unmapped and inactive.',
                    })}
                  />
                </span>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={2}>
              <EuiFlexGroup>
                <EuiFlexItem grow={false}>
                  <FieldStatusBadge status={field.status} />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiHorizontalRule margin="xs" />

          <EuiFlexGroup>
            <EuiFlexItem grow={1}>
              <EuiTitle size="xxs">
                <span>{FIELD_SUMMARIES.fieldType.label}</span>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={2}>
              <FieldFormType
                field={field}
                isEditing={isEditing}
                onTypeChange={(type) => onChange({ type })}
                streamType={streamType}
                enableGeoPointSuggestions={enableGeoPointSuggestions}
              />
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiHorizontalRule margin="xs" />

          {typeSupportsFormat(field.type) && (
            <>
              <EuiFlexGroup>
                <EuiFlexItem grow={1}>
                  <EuiTitle size="xxs">
                    <span>{FIELD_SUMMARIES.fieldFormat.label}</span>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem grow={2}>
                  {isEditing ? (
                    <FieldFormFormat
                      value={field.format}
                      onChange={(format) => onChange({ format })}
                    />
                  ) : (
                    `${field.format ?? EMPTY_CONTENT}`
                  )}
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiHorizontalRule margin="xs" />
            </>
          )}

          <EuiFlexGroup>
            <EuiFlexItem grow={1}>
              <EuiTitle size="xxs">
                <span>{FIELD_SUMMARIES.fieldParent.label}</span>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={2}>
              <EuiFlexGroup>
                <EuiFlexItem grow={false}>
                  <FieldParent parent={field.parent} />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiHorizontalRule margin="xs" />
        </EuiFlexGroup>
      </InfoPanel>
      {isEditing &&
      Streams.WiredStream.Definition.is(stream) &&
      stream.ingest.wired.routing.length > 0 ? (
        <EuiFlexItem grow={false}>
          <ChildrenAffectedCallout childStreams={stream.ingest.wired.routing} />
        </EuiFlexItem>
      ) : null}
    </>
  );
};
