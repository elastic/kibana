/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo } from 'react';
import {
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldText,
  EuiText,
  EuiButton,
  EuiButtonEmpty,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { FieldSelect } from '@kbn/field-utils/src/components/field_select/field_select';
import useObservable from 'react-use/lib/useObservable';
import { useFileUploadContext } from '../../../use_file_upload';
import { MappingEditorService } from './mapping_editor_service';

interface Props {
  onImportClick: () => void;
}

export const MappingEditor: FC<Props> = ({ onImportClick }) => {
  const { fileUploadManager } = useFileUploadContext();
  const mappingEditorService = useMemo(
    () => new MappingEditorService(fileUploadManager),
    [fileUploadManager]
  );

  const mappingsError = useObservable(
    mappingEditorService.mappingsError$,
    mappingEditorService.getMappingsError()
  );

  const mappingsEdited = useObservable(
    mappingEditorService.mappingsEdited$,
    mappingEditorService.getMappingsEdited()
  );

  const mappings = useObservable(
    mappingEditorService.mappings$,
    mappingEditorService.getMappings()
  );

  const fieldCount = useMemo(() => mappings.length, [mappings]);

  return (
    <>
      <EuiText size="s" color="subdued">
        <FormattedMessage
          id="xpack.fileUpload.mappingEditor.fieldCountDescription"
          defaultMessage={
            '{fieldCount, plural, one {# field found} other {# fields found}}. This list includes fields detected in the files to import, plus any mappings defined in previous uploads for this index. Note that the field types cannot be changed after creating the index.'
          }
          values={{ fieldCount }}
        />
      </EuiText>
      <EuiSpacer size="m" />

      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="m" alignItems="center">
            <EuiFlexItem>
              <strong>
                <FormattedMessage
                  id="xpack.fileUpload.mappingEditor.fieldNameLabel"
                  defaultMessage="Field name"
                />
              </strong>
            </EuiFlexItem>
            <EuiFlexItem>
              <strong>
                <FormattedMessage
                  id="xpack.fileUpload.mappingEditor.fieldTypeLabel"
                  defaultMessage="Field type"
                />
              </strong>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        {mappings.map((mapping, index) => {
          const { name, mappingProperty } = mapping;
          const nameInvalid =
            mappingsError?.errors[index]?.nameError || mappingsError?.errors[index]?.duplicateError;

          return (
            <EuiFlexItem key={index}>
              <EuiFlexGroup gutterSize="m" alignItems="center">
                <EuiFlexItem>
                  <EuiFieldText
                    isInvalid={nameInvalid}
                    compressed
                    value={name}
                    placeholder={i18n.translate(
                      'xpack.fileUpload.mappingEditor.fieldNamePlaceholder',
                      {
                        defaultMessage: 'Enter field name',
                      }
                    )}
                    fullWidth
                    onChange={(e) =>
                      mappingEditorService.updateMapping(
                        index,
                        e.target.value,
                        mappingProperty.type!
                      )
                    }
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  <FieldSelect
                    onTypeChange={(newType) => {
                      mappingEditorService.updateMapping(index, name, newType);
                    }}
                    selectedType={mappingProperty.type || null}
                    css={{ maxWidth: '250px' }}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>

      {mappingsError ? (
        <>
          <EuiSpacer size="s" />
          <EuiText size="xs" color="danger" data-test-subj="fileUploadLiteLookupErrorMessage">
            {mappingsError.message}
          </EuiText>
        </>
      ) : null}

      <EuiSpacer />

      <EuiFlexGroup gutterSize="none">
        <EuiFlexItem grow={true}>
          <EuiFlexGroup gutterSize="none">
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="fileUploadLiteLookupImportButton"
                disabled={mappingsError !== null}
                onClick={() => {
                  mappingEditorService.applyChanges();
                  onImportClick();
                }}
                fullWidth={false}
              >
                <FormattedMessage id="xpack.fileUpload.import" defaultMessage="Import" />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem grow={true}>
          <div css={{ width: '255px', textAlign: 'right' }}>
            <EuiButtonEmpty
              data-test-subj="fileUploadLiteLookupResetButton"
              flush="right"
              disabled={mappingsEdited === false}
              onClick={() => {
                mappingEditorService.reset();
              }}
            >
              <FormattedMessage id="xpack.fileUpload.reset" defaultMessage="Reset to default" />
            </EuiButtonEmpty>
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
