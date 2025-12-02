/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useEffect, useMemo } from 'react';
import { EuiSpacer, EuiFlexGroup, EuiFlexItem, EuiFieldText, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FieldSelect } from '@kbn/field-utils/src/components/field_select/field_select';
import useObservable from 'react-use/lib/useObservable';
import { FormattedMessage } from '@kbn/i18n-react';
import type { MappingEditorService } from './mapping_editor_service';

interface Props {
  mappingEditorService: MappingEditorService;
}

export const MappingEditor: FC<Props> = ({ mappingEditorService }) => {
  const mappings = useObservable(
    mappingEditorService.mappings$,
    mappingEditorService.getMappings()
  );

  const fieldCount = useMemo(() => mappings.length, [mappings]);

  useEffect(() => {
    return () => {
      mappingEditorService.destroy();
    };
  }, [mappingEditorService]);

  return (
    <>
      <EuiText size="s" color="subdued">
        <FormattedMessage
          id="xpack.fileUpload.mappingEditor.fieldCountDescription"
          defaultMessage={
            "{fieldCount} fields found. Bear in mind you can't change the field type after creating this index."
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
                {i18n.translate('xpack.fileUpload.mappingEditor.fieldNameLabel', {
                  defaultMessage: 'Field name',
                })}
              </strong>
            </EuiFlexItem>
            <EuiFlexItem>
              <strong>
                {i18n.translate('xpack.fileUpload.mappingEditor.fieldTypeLabel', {
                  defaultMessage: 'Field type',
                })}
              </strong>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        {mappings.map((mapping, index) => {
          const { name, mappingProperty } = mapping;

          return (
            <EuiFlexItem key={index}>
              <EuiFlexGroup gutterSize="m" alignItems="center">
                <EuiFlexItem>
                  <EuiFieldText
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
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>
    </>
  );
};
