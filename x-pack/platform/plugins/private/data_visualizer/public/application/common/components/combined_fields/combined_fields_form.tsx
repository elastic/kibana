/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { Component } from 'react';

import {
  EuiFormRow,
  EuiPopover,
  EuiContextMenu,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

import type { IngestPipeline } from '@kbn/file-upload-plugin/common';
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type { FileAnalysis } from '@kbn/file-upload';
import { getFieldsFromMappings } from '@kbn/file-upload/file_upload_manager';
import type { CombinedField } from './types';
import { GeoPointForm } from './geo_point';
import { CombinedFieldLabel } from './combined_field_label';
import { removeCombinedFieldsFromMappings, removeCombinedFieldsFromPipeline } from './utils';
import { SemanticTextForm } from './semantic_text';

interface Props {
  mappings: MappingTypeMapping;
  pipelines: IngestPipeline[];
  onMappingsChange(mappings: string): void;
  onPipelinesChange(pipeline: IngestPipeline[]): void;
  combinedFields: CombinedField[];
  onCombinedFieldsChange(combinedFields: CombinedField[]): void;
  isDisabled: boolean;
  filesStatus: FileAnalysis[];
}

interface State {
  isPopoverOpen: boolean;
}

export type AddCombinedField = (
  combinedField: CombinedField,
  addToMappings: (mappings: MappingTypeMapping) => MappingTypeMapping,
  addToPipelines: (pipelines: IngestPipeline[]) => IngestPipeline[]
) => void;

export class CombinedFieldsForm extends Component<Props, State> {
  state: State = {
    isPopoverOpen: false,
  };

  togglePopover = () => {
    this.setState((prevState) => ({
      isPopoverOpen: !prevState.isPopoverOpen,
    }));
  };

  closePopover = () => {
    this.setState({
      isPopoverOpen: false,
    });
  };

  addCombinedField = (
    combinedField: CombinedField,
    addToMappings: (mappings: MappingTypeMapping) => MappingTypeMapping,
    addToPipelines: (pipelines: IngestPipeline[]) => IngestPipeline[]
  ) => {
    const mappings = this.props.mappings;
    const pipelines = this.props.pipelines;

    const newPipelines = addToPipelines(pipelines);
    this.props.onPipelinesChange(newPipelines);

    const newMappings = addToMappings(mappings);
    this.props.onMappingsChange(JSON.stringify(newMappings, null, 2));

    this.props.onCombinedFieldsChange([...this.props.combinedFields, combinedField]);

    this.closePopover();
  };

  removeCombinedField = (index: number) => {
    const updatedCombinedFields = [...this.props.combinedFields];
    const removedCombinedFields = updatedCombinedFields.splice(index, 1);

    this.props.onPipelinesChange(
      this.props.pipelines.map((pipeline) =>
        removeCombinedFieldsFromPipeline(pipeline, removedCombinedFields)
      )
    );
    this.props.onMappingsChange(
      JSON.stringify(removeCombinedFieldsFromMappings(this.props.mappings, removedCombinedFields))
    );
    this.props.onCombinedFieldsChange(updatedCombinedFields);
  };

  hasNameCollision = (name: string) => {
    const fieldExists = getFieldsFromMappings(this.props.mappings).some(
      (field) => field.name === name
    );
    if (fieldExists) {
      // collision with column name
      return true;
    }

    if (
      this.props.combinedFields.some((combinedField) => combinedField.combinedFieldName === name)
    ) {
      // collision with combined field name
      return true;
    }

    return Object.hasOwn(this.props.mappings?.properties ?? {}, name);
  };

  render() {
    const geoPointLabel = i18n.translate(
      'xpack.dataVisualizer.file.geoPointForm.combinedFieldLabel',
      {
        defaultMessage: 'Add geo point field',
      }
    );

    const semanticTextLabel = i18n.translate(
      'xpack.dataVisualizer.file.semanticTextForm.combinedFieldLabel',
      {
        defaultMessage: 'Add semantic text field',
      }
    );
    const panels = [
      {
        id: 0,
        items: [
          {
            name: geoPointLabel,
            panel: 1,
          },
          {
            name: semanticTextLabel,
            panel: 2,
          },
        ],
      },
      {
        id: 1,
        title: geoPointLabel,
        content: (
          <GeoPointForm
            addCombinedField={this.addCombinedField}
            hasNameCollision={this.hasNameCollision}
            results={this.props.filesStatus ? this.props.filesStatus[0].results! : undefined}
          />
        ),
      },
      {
        id: 2,
        title: semanticTextLabel,
        content: (
          <SemanticTextForm
            addCombinedField={this.addCombinedField}
            hasNameCollision={this.hasNameCollision}
            mappings={this.props.mappings}
          />
        ),
      },
    ];
    return (
      <EuiFormRow
        label={i18n.translate('xpack.dataVisualizer.combinedFieldsLabel', {
          defaultMessage: 'Automatically created fields',
        })}
      >
        <div>
          {this.props.combinedFields.map((combinedField: CombinedField, idx: number) => (
            <EuiFlexGroup key={idx} gutterSize="s">
              <EuiFlexItem>
                <CombinedFieldLabel combinedField={combinedField} />
              </EuiFlexItem>
              {!this.props.isDisabled && (
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    iconType="trash"
                    color="danger"
                    onClick={this.removeCombinedField.bind(null, idx)}
                    title={i18n.translate('xpack.dataVisualizer.removeCombinedFieldsLabel', {
                      defaultMessage: 'Remove combined field',
                    })}
                    aria-label={i18n.translate('xpack.dataVisualizer.removeCombinedFieldsLabel', {
                      defaultMessage: 'Remove combined field',
                    })}
                  />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          ))}
          <EuiPopover
            id="combineFieldsPopover"
            button={
              <EuiButtonEmpty
                onClick={this.togglePopover}
                size="xs"
                iconType="plusInCircleFilled"
                isDisabled={this.props.isDisabled}
              >
                <FormattedMessage
                  id="xpack.dataVisualizer.addCombinedFieldsLabel"
                  defaultMessage="Add additional field"
                />
              </EuiButtonEmpty>
            }
            isOpen={this.state.isPopoverOpen}
            closePopover={this.closePopover}
            anchorPosition="rightCenter"
          >
            <EuiContextMenu initialPanelId={0} panels={panels} />
          </EuiPopover>
        </div>
      </EuiFormRow>
    );
  }
}
