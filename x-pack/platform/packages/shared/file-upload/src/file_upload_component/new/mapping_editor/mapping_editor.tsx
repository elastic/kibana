/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useEffect, useMemo } from 'react';
import {
  EuiPanel,
  EuiTitle,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FieldSelect } from '@kbn/field-utils/src/components/field_select/field_select';
import useObservable from 'react-use/lib/useObservable';
import { useFileUploadContext } from '../../../use_file_upload';
import { MappingEditorService } from './mapping_editor_service';

interface Props {
  tt?: string;
}

export const MappingEditor: FC<Props> = ({}) => {
  // const [mappings, setMappings] = useState<Array<Record<string, string>>>([]);
  const { fileUploadManager } = useFileUploadContext();

  const mappingEditorService = useMemo(
    () => new MappingEditorService(fileUploadManager),
    [fileUploadManager]
  );

  const mappings = useObservable(
    mappingEditorService.getMappings$(),
    mappingEditorService.getMappings()
  );

  useEffect(() => {
    return () => {
      mappingEditorService.destroy();
    };
  }, [mappingEditorService]);

  // useEffect(() => {
  //   const subscription = mappingEditorService.mappings$.subscribe(setMappings);
  //   return () => subscription.unsubscribe();
  // }, [mappingEditorService]);

  return (
    <EuiPanel paddingSize="m">
      <EuiTitle size="s">
        <h3>
          {i18n.translate('xpack.fileUpload.mappingEditor.title', {
            defaultMessage: 'Field mappings',
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="m" />

      <EuiFlexGroup direction="column" gutterSize="s">
        {/* Header Row */}
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

        {/* Mapping Rows */}
        {mappings.map((mapping, index) => {
          const { name, mappingProperty } = mapping;

          return (
            <EuiFlexItem key={index}>
              <EuiFlexGroup gutterSize="m" alignItems="center">
                <EuiFlexItem>
                  <EuiFieldText
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
                      if (newType) {
                        mappingEditorService.updateMapping(index, name, newType);
                      }
                    }}
                    selectedType={mappingProperty.type!}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>
    </EuiPanel>
  );
};
