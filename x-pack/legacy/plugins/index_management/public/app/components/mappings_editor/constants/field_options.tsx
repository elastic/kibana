/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiText } from '@elastic/eui';

import { DataType, ParameterName, SelectOption, SuperSelectOption } from '../types';
import { FIELD_OPTIONS_TEXTS, LANGUAGE_OPTIONS_TEXT, FieldOption } from './field_options_i18n';
import { INDEX_DEFAULT } from './default_values';
import { MAIN_DATA_TYPE_DEFINITION } from './data_types_definition';

export const TYPE_NOT_ALLOWED_MULTIFIELD: DataType[] = ['object', 'nested', 'alias'];

export const DYNAMIC_SETTING_OPTIONS = [
  { value: true, text: 'true' },
  { value: false, text: 'false' },
  { value: 'strict', text: 'strict' },
];

export const FIELD_TYPES_OPTIONS = Object.entries(MAIN_DATA_TYPE_DEFINITION).map(
  ([dataType, { label }]) => ({
    value: dataType,
    text: label,
  })
);

interface SuperSelectOptionConfig {
  inputDisplay: string;
  dropdownDisplay: JSX.Element;
}

export const getSuperSelectOption = (
  title: string,
  description: string
): SuperSelectOptionConfig => ({
  inputDisplay: title,
  dropdownDisplay: (
    <>
      <strong>{title}</strong>
      <EuiText size="s" color="subdued">
        <p className="euiTextColor--subdued">{description}</p>
      </EuiText>
    </>
  ),
});

const getOptionTexts = (option: FieldOption): SuperSelectOptionConfig =>
  getSuperSelectOption(FIELD_OPTIONS_TEXTS[option].title, FIELD_OPTIONS_TEXTS[option].description);

type ParametersOptions = ParameterName | 'languageAnalyzer';

export const PARAMETERS_OPTIONS: {
  [key in ParametersOptions]?: SelectOption[] | SuperSelectOption[];
} = {
  index_options: [
    {
      value: 'docs',
      ...getOptionTexts('indexOptions.docs'),
    },
    {
      value: 'freqs',
      ...getOptionTexts('indexOptions.freqs'),
    },
    {
      value: 'positions',
      ...getOptionTexts('indexOptions.positions'),
    },
    {
      value: 'offsets',
      ...getOptionTexts('indexOptions.offsets'),
    },
  ] as SuperSelectOption[],
  analyzer: [
    {
      value: INDEX_DEFAULT,
      ...getOptionTexts('analyzer.indexDefault'),
    },
    {
      value: 'standard',
      ...getOptionTexts('analyzer.standard'),
    },
    {
      value: 'simple',
      ...getOptionTexts('analyzer.simple'),
    },
    {
      value: 'whitespace',
      ...getOptionTexts('analyzer.whitespace'),
    },
    {
      value: 'stop',
      ...getOptionTexts('analyzer.stop'),
    },
    {
      value: 'keyword',
      ...getOptionTexts('analyzer.keyword'),
    },
    {
      value: 'pattern',
      ...getOptionTexts('analyzer.pattern'),
    },
    {
      value: 'fingerprint',
      ...getOptionTexts('analyzer.fingerprint'),
    },
    {
      value: 'language',
      ...getOptionTexts('analyzer.language'),
    },
  ] as SuperSelectOption[],
  languageAnalyzer: Object.entries(LANGUAGE_OPTIONS_TEXT).map(([value, text]) => ({
    value,
    text,
  })),
  similarity: [
    {
      value: 'BM25',
      ...getOptionTexts('similarity.bm25'),
    },
    {
      value: 'boolean',
      ...getOptionTexts('similarity.boolean'),
    },
  ] as SuperSelectOption[],
  term_vector: [
    {
      value: 'no',
      ...getOptionTexts('termVector.no'),
    },
    {
      value: 'yes',
      ...getOptionTexts('termVector.yes'),
    },
    {
      value: 'with_positions',
      ...getOptionTexts('termVector.withPositions'),
    },
    {
      value: 'with_offsets',
      ...getOptionTexts('termVector.withOffsets'),
    },
    {
      value: 'with_positions_offsets',
      ...getOptionTexts('termVector.withPositionsOffsets'),
    },
    {
      value: 'with_positions_payloads',
      ...getOptionTexts('termVector.withPositionsPayloads'),
    },
    {
      value: 'with_positions_offsets_payloads',
      ...getOptionTexts('termVector.withPositionsOffsetsPayloads'),
    },
  ] as SuperSelectOption[],
};
