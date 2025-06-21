/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormHelpText, EuiPopoverTitle, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
// import type { DataView, DataViewField } from '@kbn/data-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
import { SingleFieldSelect } from '../../../../../components/single_field_select';
import { inputStrings } from '../../../../input_strings';
import { LeftFieldSelector } from '../common/left_field_selector';
import { JoinField } from '../..';
import type {
  ESQLTermSourceDescriptor,
  JoinSourceDescriptor,
} from '../../../../../../common/descriptor_types';
import { ESQLEditor, IOnEsqlChangeParams } from '../../../../../components/esql_editor';
import { getTermsFields } from '../../../../../index_pattern_util';

// import { getIndexPatternService } from '../../../../../kibana_services';
// import { getGeoFields } from '../../../../../index_pattern_util';
// import { GeoIndexPatternSelect } from '../../../../../components/geo_index_pattern_select';
// import { GeoFieldSelect } from '../../../../../components/geo_field_select';
//
// import { inputStrings } from '../../../../input_strings';
// import { RelationshipExpression } from '../../../../../classes/layers/wizards/spatial_join_wizard';
// import { DEFAULT_WITHIN_DISTANCE } from '../../../../../classes/sources/join_sources';

interface Props {
  // Left source props (static - can not change)
  leftSourceName?: string;

  // Left field props
  leftValue?: string;
  leftFields: JoinField[];
  onLeftFieldChange: (leftField: string) => void;

  // Right source props
  sourceDescriptor: Partial<ESQLTermSourceDescriptor>;
  onSourceDescriptorChange: (sourceDescriptor: Partial<JoinSourceDescriptor>) => void;
  rightFields: any[];
}

function getKeywordFields(fields: any[]) {
  return fields.filter((field) => field.type === 'keyword');
}

export function ESQLJoinPopoverContent(props: Props) {
  function onEsqlChange(params: IOnEsqlChangeParams) {
    console.log('on ESQL change');
    console.log(params);

    console.log(props.sourceDescriptor);

    props.sourceDescriptor.esql = params.esql;
    props.sourceDescriptor.columns = params.columns;
    props.onSourceDescriptorChange(props.sourceDescriptor);
  }

  function onRightFieldChange(term?: string) {
    if (!term || term.length === 0) {
      return;
    }

    props.onSourceDescriptorChange({
      ...props.sourceDescriptor,
      term,
    });
  }

  function renderRightFieldSelect() {
    console.log('render esql right field select!', props);
    if (!props.rightFields || !props.leftValue || props.rightFields.length < 1) {
      console.log('skip!');
      return null;
    }

    const keywordFields = getKeywordFields(props.rightFields);

    return (
      <EuiFormRow
        label={i18n.translate('xpack.maps.esqlTermJoinExpression.rightFieldLabel', {
          defaultMessage: 'Right field',
        })}
        helpText={i18n.translate('xpack.maps.esqlTermJoinExpression.rightSourceLabelHelpText', {
          defaultMessage: 'Right source field that contains the shared key.',
        })}
      >
        <SingleFieldSelect
          placeholder={inputStrings.fieldSelectPlaceholder}
          value={props.sourceDescriptor.term ?? null}
          onChange={onRightFieldChange}
          fields={keywordFields}
          isClearable={false}
        />
      </EuiFormRow>
    );
  }

  function verifyColumns(columns) {
    console.log('c', columns);
    if (columns.length < 2) {
      throw new Error('Need at least two columns. One to join, and one to symbolize the features');
    }
    console.log('GOOD!');
  }
  function renderEsqlInput() {
    console.log('yow', props.leftValue);
    if (!props.leftValue) {
      return null;
    }
    return (
      <EuiFormRow
        fullWidth
        label={i18n.translate('xpack.maps.esqlJoinExpression.rightSourceLabel', {
          defaultMessage: 'Right source',
        })}
      >
        <ESQLEditor
          verifyColumns={verifyColumns}
          onESQLChange={onEsqlChange}
          esql={props.sourceDescriptor.esql || ''}
        />
      </EuiFormRow>
    );
  }

  console.log('render opopuver!');
  return (
    <div style={{ width: '800px' }}>
      <EuiPopoverTitle>
        {i18n.translate('xpack.maps.spatialJoinExpression.popoverTitle', {
          defaultMessage: 'Configure ES|QL join',
        })}
      </EuiPopoverTitle>
      <EuiFormHelpText className="mapJoinExpressionHelpText">
        <FormattedMessage
          id="xpack.maps.esqlTermJoinExpression.helpText"
          defaultMessage="Configure the shared key that combines layer features, the left source, with the results of an ES|QL expression, the right source."
        />
      </EuiFormHelpText>

      <LeftFieldSelector
        leftSourceName={props.leftSourceName}
        leftFields={props.leftFields}
        onLeftFieldChange={props.onLeftFieldChange}
        leftValue={props.leftValue}
      />

      {renderEsqlInput()}

      {renderRightFieldSelect()}
    </div>
  );
}
